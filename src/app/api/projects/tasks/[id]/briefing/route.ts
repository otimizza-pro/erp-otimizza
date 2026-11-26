import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { randomBytes } from "node:crypto";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { formatContactFirstName } from "@/modules/clients/contact-name";
import { getClientDnaContext, sanitizeBriefingDifferentials } from "@/modules/clients/dna-briefing-sync";
import { getCatalogItemsByClientId, syncCatalogItems } from "@/modules/clients/catalog-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: taskId } = await params;

    // 1. Buscar a tarefa, projeto e cliente associado
    const taskRes = await query<{
      id: string;
      project_id: string;
      title: string;
      status: string;
      client_id: string | null;
      project_name: string;
      trade_name: string | null;
      client_name: string | null;
      client_type: string | null;
      client_website: string | null;
      client_instagram: string | null;
      contact_person_name: string | null;
    }>(
      `
      SELECT 
        t.id, 
        t.project_id, 
        t.title, 
        t.status,
        p.client_id,
        p.name as project_name,
        c.trade_name,
        c.name as client_name,
        c.type as client_type,
        ci.website_url as client_website,
        ci.instagram_handle as client_instagram,
        (
          SELECT cc.name 
          FROM public.client_contacts cc 
          WHERE cc.client_id = c.id 
          ORDER BY cc.is_primary DESC, cc.created_at ASC 
          LIMIT 1
        ) as contact_person_name
      FROM public.project_tasks t
      JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.clients c ON c.id = p.client_id
      LEFT JOIN public.client_identities ci ON ci.client_id = c.id
      WHERE t.id = $1
      `,
      [taskId]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    const task = taskRes.rows[0];

    // 2. Buscar DNA estratégico completo do cliente (identidade, DNA comercial e públicos)
    let dnaContext = null;
    if (task.client_id) {
      try {
        dnaContext = await getClientDnaContext(task.client_id);
      } catch (dnaErr) {
        console.warn("Aviso ao carregar DNA do cliente para o briefing:", dnaErr);
      }
    }

    // 3. Verificar se já existe uma sessão para esta tarefa ou projeto
    const sessionRes = await query(
      `SELECT * FROM public.client_briefing_sessions WHERE task_id = $1 OR project_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [taskId, task.project_id]
    );

    let session = sessionRes.rows[0];

    // Se ainda não existir, cria automaticamente uma sessão pré-populada com o DNA
    if (!session) {
      const token = randomBytes(16).toString("hex");
      const companyName = task.trade_name || task.client_name || dnaContext?.companyName || task.project_name || "Sua Empresa";
      const rawContact = task.contact_person_name || (task.client_type === "PF" ? task.client_name : "") || dnaContext?.contactName || "Parceiro";
      const contactName = formatContactFirstName(rawContact, companyName);
      const websiteUrl = task.client_website || dnaContext?.websiteUrl || "";
      const instagramUrl = task.client_instagram
        ? (task.client_instagram.startsWith("http") ? task.client_instagram : `https://instagram.com/${task.client_instagram.replace("@", "")}`)
        : (dnaContext?.instagramUrl || "");
      const initialNotes = dnaContext?.compiledInitialNotes || "";
      const initialExt = dnaContext?.initialExtractedIdentity || {};

      const initialMessage = {
        id: "msg_intro",
        sender: "assistant",
        text: `Olá, ${contactName}! 👋 Sou a Edivânia, estrategista de comunicação aqui da Otimizza.\n\nA nossa equipe preparou este briefing sobre a ${companyName}. Estou aqui para bater um papo leve e descontraído com você sobre o posicionamento e o conteúdo das suas redes sociais.\n\nFique super tranquilo: não é um questionário técnico! Se em algum momento você quiser sugestões ou quiser responder depois, basta me avisar.\n\nPodemos começar agora?`,
        options: [
          { label: "🚀 Sim, vamos começar!", value: "START", action: "APPROVE" },
          { label: "Como vai funcionar?", value: "EXPLAIN", action: "EXPLAIN" },
        ],
        timestamp: new Date().toISOString(),
      };

      const insertRes = await query(
        `
        INSERT INTO public.client_briefing_sessions (
          token, project_id, task_id, client_id, company_name, contact_name,
          website_url, instagram_url, initial_notes, extracted_identity, conversation_history, status, progress_percent
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', 15
        ) RETURNING *
        `,
        [
          token,
          task.project_id,
          task.id,
          task.client_id,
          companyName,
          contactName,
          websiteUrl,
          instagramUrl,
          initialNotes,
          JSON.stringify(initialExt),
          JSON.stringify([initialMessage]),
        ]
      );
      session = insertRes.rows[0];
    } else {
      // Complementar com dados cadastrais e DNA se a sessão estiver com campos em branco
      let shouldUpdateDb = false;

      if (!session.company_name || session.company_name === "Sua Empresa") {
        session.company_name = task.trade_name || task.client_name || dnaContext?.companyName || task.project_name || "Sua Empresa";
        shouldUpdateDb = true;
      }
      if (!session.contact_name || session.contact_name === "Parceiro" || session.contact_name === session.company_name) {
        const rawContact = task.contact_person_name || (task.client_type === "PF" ? task.client_name : "") || dnaContext?.contactName || "Parceiro";
        session.contact_name = formatContactFirstName(rawContact, session.company_name);
        shouldUpdateDb = true;
      } else {
        session.contact_name = formatContactFirstName(session.contact_name, session.company_name);
      }
      if (!session.website_url && (task.client_website || dnaContext?.websiteUrl)) {
        session.website_url = task.client_website || dnaContext?.websiteUrl;
        shouldUpdateDb = true;
      }
      if (!session.instagram_url && (task.client_instagram || dnaContext?.instagramUrl)) {
        session.instagram_url = task.client_instagram
          ? (task.client_instagram.startsWith("http") ? task.client_instagram : `https://instagram.com/${task.client_instagram.replace("@", "")}`)
          : (dnaContext?.instagramUrl || "");
        shouldUpdateDb = true;
      }
      if ((!session.initial_notes || session.initial_notes.trim() === "") && dnaContext?.compiledInitialNotes) {
        session.initial_notes = dnaContext.compiledInitialNotes;
        shouldUpdateDb = true;
      }

      let currentExt: Record<string, unknown> = {};
      try {
        currentExt = typeof session.extracted_identity === "string" ? JSON.parse(session.extracted_identity) : (session.extracted_identity || {});
      } catch {
        currentExt = {};
      }

      if (Object.keys(currentExt).length === 0 && dnaContext?.initialExtractedIdentity) {
        session.extracted_identity = dnaContext.initialExtractedIdentity;
        shouldUpdateDb = true;
      } else if (dnaContext?.initialExtractedIdentity) {
        // Enriquecer campos que estiverem em branco sem sobrescrever o que já foi preenchido
        let extUpdated = false;
        const mergedExt = { ...currentExt };
        if (!mergedExt.marketNiche && dnaContext.category) {
          mergedExt.marketNiche = dnaContext.category;
          extUpdated = true;
        }
        if (!mergedExt.valueProposition && dnaContext.servicesOffered) {
          mergedExt.valueProposition = dnaContext.servicesOffered;
          extUpdated = true;
        }
        if (extUpdated) {
          session.extracted_identity = mergedExt;
          shouldUpdateDb = true;
        }
      }

      if (shouldUpdateDb) {
        await query(
          `UPDATE public.client_briefing_sessions 
           SET company_name = $1, contact_name = $2, website_url = $3, instagram_url = $4,
               initial_notes = $5, extracted_identity = $6, updated_at = NOW()
           WHERE id = $7`,
          [
            session.company_name,
            session.contact_name,
            session.website_url,
            session.instagram_url,
            session.initial_notes,
            JSON.stringify(typeof session.extracted_identity === "string" ? JSON.parse(session.extracted_identity) : session.extracted_identity),
            session.id,
          ]
        );
      }
    }

    const clientIdentity = dnaContext?.clientIdentity || null;
    const clientAudiences = dnaContext?.audiences || [];

    let catalogItems: unknown[] = [];
    if (task.client_id) {
      try {
        catalogItems = await getCatalogItemsByClientId(task.client_id);
      } catch (catErr) {
        console.warn("Aviso ao carregar catálogo do cliente:", catErr);
      }
    }

    const ext = typeof session?.extracted_identity === "string" 
      ? JSON.parse(session.extracted_identity) 
      : (session?.extracted_identity || {});
    const category = clientIdentity?.market_niche || dnaContext?.category || ext.marketNiche || "";
    const servicesOffered = clientIdentity?.value_proposition || dnaContext?.servicesOffered || ext.valueProposition || "";

    return NextResponse.json({
      success: true,
      task,
      session,
      clientIdentity,
      audiences: clientAudiences,
      catalogItems,
      brandHistory: clientIdentity?.brand_history || session?.brand_history || "",
      corePromise: clientIdentity?.core_promise || session?.core_promise || "",
      nonNegotiables: session?.non_negotiables || "",
      salesObjections: clientIdentity?.sales_objections || session?.sales_objections || "",
      cnpj: session?.cnpj || "",
      cnaeCode: session?.cnae_code || "",
      cnaeDescription: session?.cnae_description || "",
      category,
      servicesOffered,
      publicUrl: session ? `/briefing/${session.token}` : "",
    });
  } catch (err: unknown) {
    console.error("Erro ao buscar sessão de briefing:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}

function parseStringList(value: unknown, splitCommas = false): string[] | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const items = value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
    return items.length > 0 ? items : null;
  }
  if (typeof value === "string") {
    const pattern = splitCommas ? /[\r\n,;]+/ : /[\r\n]+/;
    const items = value.split(pattern).map((v) => v.trim()).filter(Boolean);
    return items.length > 0 ? items : null;
  }
  return null;
}

async function syncTaskBriefingToIdentity(params: {
  clientId: string;
  category?: string | null;
  servicesOffered?: string | null;
  instagramUrl?: string | null;
  hasInstagramUrl: boolean;
  websiteUrl?: string | null;
  hasWebsiteUrl: boolean;
  brandHistory?: string | null;
  corePromise?: string | null;
  salesObjections?: string | null;
  toneOfVoice?: string[] | null;
  differentials?: string[] | null;
  catalogItems?: Parameters<typeof syncCatalogItems>[1] | null;
}) {
  const {
    clientId,
    category,
    servicesOffered,
    instagramUrl,
    hasInstagramUrl,
    websiteUrl,
    hasWebsiteUrl,
    brandHistory,
    corePromise,
    salesObjections,
    toneOfVoice,
    differentials,
    catalogItems,
  } = params;

  await query(
    `
    INSERT INTO public.client_identities (
      client_id, market_niche, value_proposition, instagram_handle, website_url,
      brand_history, core_promise, sales_objections, catalog_items,
      tone_of_voice, differentials, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::jsonb, '[]'::jsonb), $12::text[], $13::text[], NOW())
    ON CONFLICT (client_id) DO UPDATE SET
      market_niche = COALESCE(EXCLUDED.market_niche, client_identities.market_niche),
      value_proposition = COALESCE(EXCLUDED.value_proposition, client_identities.value_proposition),
      instagram_handle = CASE WHEN $10::boolean THEN NULLIF(BTRIM(COALESCE(EXCLUDED.instagram_handle, '')), '') ELSE client_identities.instagram_handle END,
      website_url = CASE WHEN $11::boolean THEN NULLIF(BTRIM(COALESCE(EXCLUDED.website_url, '')), '') ELSE client_identities.website_url END,
      brand_history = COALESCE(EXCLUDED.brand_history, client_identities.brand_history),
      core_promise = COALESCE(EXCLUDED.core_promise, client_identities.core_promise),
      sales_objections = COALESCE(EXCLUDED.sales_objections, client_identities.sales_objections),
      catalog_items = CASE WHEN EXCLUDED.catalog_items IS NOT NULL AND jsonb_array_length(EXCLUDED.catalog_items) > 0 THEN EXCLUDED.catalog_items ELSE client_identities.catalog_items END,
      tone_of_voice = CASE WHEN EXCLUDED.tone_of_voice IS NOT NULL AND COALESCE(array_length(EXCLUDED.tone_of_voice, 1), 0) > 0 THEN EXCLUDED.tone_of_voice ELSE client_identities.tone_of_voice END,
      differentials = CASE WHEN EXCLUDED.differentials IS NOT NULL AND COALESCE(array_length(EXCLUDED.differentials, 1), 0) > 0 THEN EXCLUDED.differentials ELSE client_identities.differentials END,
      updated_at = NOW()
    `,
    [
      clientId,
      category || null,
      servicesOffered || null,
      instagramUrl || null,
      websiteUrl || null,
      brandHistory || null,
      corePromise || null,
      salesObjections || null,
      catalogItems ? JSON.stringify(catalogItems) : null,
      hasInstagramUrl,
      hasWebsiteUrl,
      toneOfVoice && toneOfVoice.length > 0 ? toneOfVoice : null,
      differentials && differentials.length > 0 ? sanitizeBriefingDifferentials(differentials) : null,
    ]
  );

  if (Array.isArray(catalogItems) && catalogItems.length > 0) {
    try {
      await syncCatalogItems(clientId, catalogItems);
    } catch (syncErr) {
      console.warn("Aviso ao sincronizar catálogo do cliente:", syncErr);
    }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: taskId } = await params;
    const body = await req.json();

    const {
      companyName,
      contactName,
      websiteUrl,
      mapsUrl,
      instagramUrl,
      initialNotes,
      competitorNotes,
      extractedIdentity,
      category,
      servicesOffered,
      brandHistory,
      corePromise,
      nonNegotiables,
      salesObjections,
      cnpj,
      cnaeCode,
      cnaeDescription,
      catalogItems,
    } = body;

    const mergedExt = {
      ...(extractedIdentity || {}),
      ...(category ? { marketNiche: category } : {}),
      ...(servicesOffered ? { valueProposition: servicesOffered } : {}),
    };

    const taskRes = await query<{ project_id: string; client_id: string | null }>(
      `SELECT project_id, p.client_id FROM public.project_tasks t JOIN public.projects p ON p.id = t.project_id WHERE t.id = $1`,
      [taskId]
    );
    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }
    const taskProjectId = taskRes.rows[0].project_id;
    const taskClientId = taskRes.rows[0].client_id;

    // Verificar se existe a sessão vinculada à tarefa ou ao projeto
    const sessionRes = await query(
      `SELECT * FROM public.client_briefing_sessions WHERE task_id = $1 OR project_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [taskId, taskProjectId]
    );

    let session = sessionRes.rows[0];

    if (!session) {
      const token = randomBytes(16).toString("hex");
      const insertRes = await query(
        `
        INSERT INTO public.client_briefing_sessions (
          token, project_id, task_id, client_id, company_name, contact_name,
          website_url, maps_url, instagram_url, initial_notes, competitor_notes,
          extracted_identity, conversation_history, status, progress_percent,
          brand_history, core_promise, non_negotiables, sales_objections,
          cnpj, cnae_code, cnae_description, catalog_items
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, '[]'::jsonb, 'PENDING', 15,
          $13, $14, $15, $16, $17, $18, $19, COALESCE($20::jsonb, '[]'::jsonb)
        ) RETURNING *
        `,
        [
          token,
          taskProjectId,
          taskId,
          taskClientId,
          companyName || "Empresa",
          formatContactFirstName(contactName, companyName),
          websiteUrl || null,
          mapsUrl || null,
          instagramUrl || null,
          initialNotes || null,
          competitorNotes || null,
          JSON.stringify(mergedExt),
          brandHistory || null,
          corePromise || null,
          nonNegotiables || null,
          salesObjections || null,
          cnpj || null,
          cnaeCode || null,
          cnaeDescription || null,
          catalogItems ? JSON.stringify(catalogItems) : null,
        ]
      );
      session = insertRes.rows[0];

      if (taskClientId) {
        await syncTaskBriefingToIdentity({
          clientId: taskClientId,
          category,
          servicesOffered,
          instagramUrl,
          hasInstagramUrl: instagramUrl !== undefined,
          websiteUrl,
          hasWebsiteUrl: websiteUrl !== undefined,
          brandHistory,
          corePromise,
          salesObjections,
          toneOfVoice: parseStringList(extractedIdentity?.toneOfVoice, true),
          differentials: parseStringList(extractedIdentity?.differentials, false),
          catalogItems,
        });
      }
    } else {
      // Atualizar campos pré-preenchidos pela equipe e identidade estratégica
      const updateRes = await query(
        `
        UPDATE public.client_briefing_sessions
        SET 
          company_name = $1,
          contact_name = $2,
          website_url = $3,
          maps_url = $4,
          instagram_url = $5,
          initial_notes = $6,
          competitor_notes = $7,
          extracted_identity = CASE 
            WHEN $8::jsonb IS NOT NULL THEN (COALESCE(extracted_identity, '{}'::jsonb) || $8::jsonb)
            ELSE extracted_identity 
          END,
          brand_history = $9,
          core_promise = $10,
          non_negotiables = $11,
          sales_objections = $12,
          cnpj = $13,
          cnae_code = $14,
          cnae_description = $15,
          catalog_items = CASE WHEN $16::jsonb IS NOT NULL THEN $16::jsonb ELSE catalog_items END,
          updated_at = NOW()
        WHERE id = $17
        RETURNING *
        `,
        [
          companyName !== undefined ? (companyName || "Empresa") : session.company_name,
          contactName !== undefined ? (contactName ? formatContactFirstName(contactName, companyName) : null) : session.contact_name,
          websiteUrl !== undefined ? (websiteUrl || null) : session.website_url,
          mapsUrl !== undefined ? (mapsUrl || null) : session.maps_url,
          instagramUrl !== undefined ? (instagramUrl || null) : session.instagram_url,
          initialNotes !== undefined ? (initialNotes || null) : session.initial_notes,
          competitorNotes !== undefined ? (competitorNotes || null) : session.competitor_notes,
          Object.keys(mergedExt).length > 0 ? JSON.stringify(mergedExt) : null,
          brandHistory !== undefined ? (brandHistory || null) : session.brand_history,
          corePromise !== undefined ? (corePromise || null) : session.core_promise,
          nonNegotiables !== undefined ? (nonNegotiables || null) : session.non_negotiables,
          salesObjections !== undefined ? (salesObjections || null) : session.sales_objections,
          cnpj !== undefined ? (cnpj || null) : session.cnpj,
          cnaeCode !== undefined ? (cnaeCode || null) : session.cnae_code,
          cnaeDescription !== undefined ? (cnaeDescription || null) : session.cnae_description,
          catalogItems !== undefined ? JSON.stringify(catalogItems || []) : null,
          session.id,
        ]
      );
      session = updateRes.rows[0];

      if (session.client_id) {
        await syncTaskBriefingToIdentity({
          clientId: session.client_id,
          category,
          servicesOffered,
          instagramUrl,
          hasInstagramUrl: instagramUrl !== undefined,
          websiteUrl,
          hasWebsiteUrl: websiteUrl !== undefined,
          brandHistory,
          corePromise,
          salesObjections,
          toneOfVoice: parseStringList(extractedIdentity?.toneOfVoice, true),
          differentials: parseStringList(extractedIdentity?.differentials, false),
          catalogItems,
        });
      }
    }

    return NextResponse.json({
      success: true,
      session,
      publicUrl: `/briefing/${session.token}`,
    });
  } catch (err: unknown) {
    console.error("Erro ao salvar dados prévios do briefing:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
