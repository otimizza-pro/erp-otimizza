import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { randomBytes } from "node:crypto";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { formatContactFirstName } from "@/modules/clients/contact-name";

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

    // 2. Verificar se já existe uma sessão para esta tarefa ou projeto
    const sessionRes = await query(
      `SELECT * FROM public.client_briefing_sessions WHERE task_id = $1 OR project_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [taskId, task.project_id]
    );

    let session = sessionRes.rows[0];

    // Se ainda não existir, cria automaticamente uma sessão pronta para personalização
    if (!session) {
      const token = randomBytes(16).toString("hex");
      const companyName = task.trade_name || task.client_name || task.project_name || "Sua Empresa";
      const rawContact = task.contact_person_name || (task.client_type === "PF" ? task.client_name : "") || "Parceiro";
      const contactName = formatContactFirstName(rawContact, companyName);
      const websiteUrl = task.client_website || "";
      const instagramUrl = task.client_instagram ? `https://instagram.com/${task.client_instagram.replace("@", "")}` : "";

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
          website_url, instagram_url, conversation_history, status, progress_percent
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', 15
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
          JSON.stringify([initialMessage]),
        ]
      );
      session = insertRes.rows[0];
    } else {
      // Complementar com dados cadastrais do cliente se a sessão estiver com campos em branco
      if (!session.company_name || session.company_name === "Sua Empresa") {
        session.company_name = task.trade_name || task.client_name || task.project_name || "Sua Empresa";
      }
      if (!session.contact_name || session.contact_name === "Parceiro" || session.contact_name === session.company_name) {
        const rawContact = task.contact_person_name || (task.client_type === "PF" ? task.client_name : "") || "Parceiro";
        session.contact_name = formatContactFirstName(rawContact, session.company_name);
      } else {
        session.contact_name = formatContactFirstName(session.contact_name, session.company_name);
      }
      if (!session.website_url && task.client_website) {
        session.website_url = task.client_website;
      }
      if (!session.instagram_url && task.client_instagram) {
        session.instagram_url = `https://instagram.com/${task.client_instagram.replace("@", "")}`;
      }
    }

    // Buscar Identidade do Cliente registrada se houver
    let clientIdentity = null;
    if (task.client_id) {
      const idRes = await query(
        `SELECT * FROM public.client_identities WHERE client_id = $1 LIMIT 1`,
        [task.client_id]
      );
      clientIdentity = idRes.rows[0] || null;
    }

    const ext = typeof session?.extracted_identity === "string" 
      ? JSON.parse(session.extracted_identity) 
      : (session?.extracted_identity || {});
    const category = ext.marketNiche || clientIdentity?.market_niche || "";
    const servicesOffered = ext.valueProposition || clientIdentity?.value_proposition || "";

    return NextResponse.json({
      success: true,
      task,
      session,
      clientIdentity,
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
          extracted_identity, conversation_history, status, progress_percent
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, '[]'::jsonb, 'PENDING', 15
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
        ]
      );
      session = insertRes.rows[0];

      if (taskRes.rows[0].client_id) {
        await query(
          `
          INSERT INTO public.client_identities (client_id, market_niche, value_proposition, instagram_handle, website_url, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (client_id) DO UPDATE SET
            market_niche = COALESCE(EXCLUDED.market_niche, client_identities.market_niche),
            value_proposition = COALESCE(EXCLUDED.value_proposition, client_identities.value_proposition),
            instagram_handle = COALESCE(NULLIF(EXCLUDED.instagram_handle, ''), client_identities.instagram_handle),
            website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), client_identities.website_url),
            updated_at = NOW()
          `,
          [taskRes.rows[0].client_id, category || null, servicesOffered || null, instagramUrl || null, websiteUrl || null]
        );
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
          updated_at = NOW()
        WHERE id = $9
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
          session.id,
        ]
      );
      session = updateRes.rows[0];

      if (session.client_id) {
        await query(
          `
          INSERT INTO public.client_identities (client_id, market_niche, value_proposition, instagram_handle, website_url, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (client_id) DO UPDATE SET
            market_niche = COALESCE(EXCLUDED.market_niche, client_identities.market_niche),
            value_proposition = COALESCE(EXCLUDED.value_proposition, client_identities.value_proposition),
            instagram_handle = COALESCE(NULLIF(EXCLUDED.instagram_handle, ''), client_identities.instagram_handle),
            website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), client_identities.website_url),
            updated_at = NOW()
          `,
          [session.client_id, category || null, servicesOffered || null, instagramUrl || null, websiteUrl || null]
        );
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
