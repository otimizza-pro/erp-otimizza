import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { randomBytes } from "node:crypto";
import { requireAdminUser } from "@/lib/auth/require-auth";

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
      client_website: string | null;
      client_instagram: string | null;
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
        ci.website_url as client_website,
        ci.instagram_handle as client_instagram
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
    let sessionRes = await query(
      `SELECT * FROM public.client_briefing_sessions WHERE task_id = $1 OR project_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [taskId, task.project_id]
    );

    let session = sessionRes.rows[0];

    // Se ainda não existir, cria automaticamente uma sessão pronta para personalização
    if (!session) {
      const token = randomBytes(16).toString("hex");
      const companyName = task.trade_name || task.client_name || task.project_name || "Sua Empresa";
      const contactName = task.client_name || "Parceiro";
      const websiteUrl = task.client_website || "";
      const instagramUrl = task.client_instagram ? `https://instagram.com/${task.client_instagram.replace("@", "")}` : "";

      const initialMessage = {
        id: "msg_intro",
        sender: "assistant",
        text: `Olá, ${contactName}! 👋 Sou a Sofia, especialista em estratégia e crescimento aqui na Otimizza.\n\nO Valdemar já compartilhou comigo detalhes importantes sobre a ${companyName}. Estou aqui para guiar você na construção da estratégia e do conteúdo para suas redes sociais.\n\n💡 Dica importante: Se em algum momento você não souber uma resposta, basta me dizer "Não sei" ou pedir uma sugestão! Eu mesma crio opções para você aprovar ou ajustar com 1 clique.\n\nVamos começar?`,
        options: [
          { label: "🚀 Vamos lá!", value: "START", action: "APPROVE" },
          { label: "Quero saber como funciona", value: "EXPLAIN", action: "EXPLAIN" },
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
    }

    return NextResponse.json({
      success: true,
      task,
      session,
      publicUrl: `/briefing/${session.token}`,
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
    } = body;

    // Verificar se existe a sessão
    let sessionRes = await query(
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
          conversation_history, status, progress_percent
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '[]'::jsonb, 'PENDING', 15
        ) RETURNING *
        `,
        [
          token,
          taskRes.rows[0].project_id,
          taskId,
          taskRes.rows[0].client_id,
          companyName || "Empresa",
          contactName || "Cliente",
          websiteUrl || null,
          mapsUrl || null,
          instagramUrl || null,
          initialNotes || null,
          competitorNotes || null,
        ]
      );
      session = insertRes.rows[0];
    } else {
      // Atualizar campos pré-preenchidos por Valdemar
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
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
        `,
        [
          companyName,
          contactName,
          websiteUrl || null,
          mapsUrl || null,
          instagramUrl || null,
          initialNotes || null,
          competitorNotes || null,
          session.id,
        ]
      );
      session = updateRes.rows[0];
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
