import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { randomBytes } from "node:crypto";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { formatContactFirstName } from "@/modules/clients/contact-name";
import { getClientDnaContext } from "@/modules/clients/dna-briefing-sync";
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
    const category = ext.marketNiche || dnaContext?.category || clientIdentity?.market_niche || "";
    const servicesOffered = ext.valueProposition || dnaContext?.servicesOffered || clientIdentity?.value_proposition || "";

    return NextResponse.json({
      success: true,
      task,
      session,
      clientIdentity,
      audiences: clientAudiences,
      catalogItems,
      brandHistory: session?.brand_history || clientIdentity?.brand_history || "",
      corePromise: session?.core_promise || clientIdentity?.core_promise || "",
      nonNegotiables: session?.non_negotiables || "",
      salesObjections: session?.sales_objections || clientIdentity?.sales_objections || "",
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

    // Verificar se existe a sessão
    const sessionRes = await query(
      `SELECT * FROM public.client_briefing_sessions WHERE task_id = $1 LIMIT 1`,
      [taskId]
    );

    let session = sessionRes.rows[0];

    if (!session) {
      // Obter dados da tarefa para criar
      const taskRes = await query<{ project_id: string; client_id: string | null }>(
        `SELECT project_id, p.client_id FROM public.project_tasks t JOIN public.projects p ON p.id = t.project_id WHERE t.id = $1`,
        [taskId]
      );
      if (taskRes.rows.length === 0) {
        return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
      }
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
          taskRes.rows[0].project_id,
          taskId,
          taskRes.rows[0].client_id,
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

      const effectiveClientId = taskRes.rows[0].client_id;
      if (effectiveClientId) {
        await query(
          `
          INSERT INTO public.client_identities (
            client_id, market_niche, value_proposition, instagram_handle, website_url,
            brand_history, core_promise, sales_objections, catalog_items, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::jsonb, '[]'::jsonb), NOW())
          ON CONFLICT (client_id) DO UPDATE SET
            market_niche = COALESCE(EXCLUDED.market_niche, client_identities.market_niche),
            value_proposition = COALESCE(EXCLUDED.value_proposition, client_identities.value_proposition),
            instagram_handle = COALESCE(NULLIF(EXCLUDED.instagram_handle, ''), client_identities.instagram_handle),
            website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), client_identities.website_url),
            brand_history = COALESCE(EXCLUDED.brand_history, client_identities.brand_history),
            core_promise = COALESCE(EXCLUDED.core_promise, client_identities.core_promise),
            sales_objections = COALESCE(EXCLUDED.sales_objections, client_identities.sales_objections),
            catalog_items = CASE WHEN EXCLUDED.catalog_items IS NOT NULL AND jsonb_array_length(EXCLUDED.catalog_items) > 0 THEN EXCLUDED.catalog_items ELSE client_identities.catalog_items END,
            updated_at = NOW()
          `,
          [
            effectiveClientId,
            category || null,
            servicesOffered || null,
            instagramUrl || null,
            websiteUrl || null,
            brandHistory || null,
            corePromise || null,
            salesObjections || null,
            catalogItems ? JSON.stringify(catalogItems) : null,
          ]
        );

        if (Array.isArray(catalogItems) && catalogItems.length > 0) {
          try {
            await syncCatalogItems(effectiveClientId, catalogItems);
          } catch (syncErr) {
            console.warn("Aviso ao sincronizar catálogo do cliente:", syncErr);
          }
        }
      }
    } else {
      // Atualizar campos pré-preenchidos pela equipe e identidade estratégica
      const updateRes = await query(
        `
        UPDATE public.client_briefing_sessions
        SET 
          company_name = COALESCE($1, company_name),
          contact_name = COALESCE($2, contact_name),
          website_url = $3,
          maps_url = $4,
          instagram_url = $5,
          initial_notes = $6,
          competitor_notes = $7,
          extracted_identity = CASE 
            WHEN $8::jsonb IS NOT NULL THEN (COALESCE(extracted_identity, '{}'::jsonb) || $8::jsonb)
            ELSE extracted_identity 
          END,
          brand_history = COALESCE($9, brand_history),
          core_promise = COALESCE($10, core_promise),
          non_negotiables = COALESCE($11, non_negotiables),
          sales_objections = COALESCE($12, sales_objections),
          cnpj = COALESCE($13, cnpj),
          cnae_code = COALESCE($14, cnae_code),
          cnae_description = COALESCE($15, cnae_description),
          catalog_items = CASE WHEN $16::jsonb IS NOT NULL THEN $16::jsonb ELSE catalog_items END,
          updated_at = NOW()
        WHERE id = $17
        RETURNING *
        `,
        [
          companyName,
          contactName ? formatContactFirstName(contactName, companyName) : null,
          websiteUrl || null,
          mapsUrl || null,
          instagramUrl || null,
          initialNotes || null,
          competitorNotes || null,
          Object.keys(mergedExt).length > 0 ? JSON.stringify(mergedExt) : null,
          brandHistory || null,
          corePromise || null,
          nonNegotiables || null,
          salesObjections || null,
          cnpj || null,
          cnaeCode || null,
          cnaeDescription || null,
          catalogItems ? JSON.stringify(catalogItems) : null,
          session.id,
        ]
      );
      session = updateRes.rows[0];

      if (session.client_id) {
        await query(
          `
          INSERT INTO public.client_identities (
            client_id, market_niche, value_proposition, instagram_handle, website_url,
            brand_history, core_promise, sales_objections, catalog_items, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::jsonb, '[]'::jsonb), NOW())
          ON CONFLICT (client_id) DO UPDATE SET
            market_niche = COALESCE(EXCLUDED.market_niche, client_identities.market_niche),
            value_proposition = COALESCE(EXCLUDED.value_proposition, client_identities.value_proposition),
            instagram_handle = COALESCE(NULLIF(EXCLUDED.instagram_handle, ''), client_identities.instagram_handle),
            website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), client_identities.website_url),
            brand_history = COALESCE(EXCLUDED.brand_history, client_identities.brand_history),
            core_promise = COALESCE(EXCLUDED.core_promise, client_identities.core_promise),
            sales_objections = COALESCE(EXCLUDED.sales_objections, client_identities.sales_objections),
            catalog_items = CASE WHEN EXCLUDED.catalog_items IS NOT NULL AND jsonb_array_length(EXCLUDED.catalog_items) > 0 THEN EXCLUDED.catalog_items ELSE client_identities.catalog_items END,
            updated_at = NOW()
          `,
          [
            session.client_id,
            category || null,
            servicesOffered || null,
            instagramUrl || null,
            websiteUrl || null,
            brandHistory || null,
            corePromise || null,
            salesObjections || null,
            catalogItems ? JSON.stringify(catalogItems) : null,
          ]
        );

        if (Array.isArray(catalogItems) && catalogItems.length > 0) {
          try {
            await syncCatalogItems(session.client_id, catalogItems);
          } catch (syncErr) {
            console.warn("Aviso ao sincronizar catálogo do cliente:", syncErr);
          }
        }
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
