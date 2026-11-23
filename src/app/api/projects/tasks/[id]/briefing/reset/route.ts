import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: taskId } = await params;

    const taskRes = await query<{
      project_id: string;
      client_id: string | null;
      trade_name: string | null;
      client_name: string | null;
      project_name: string;
    }>(
      `
      SELECT t.project_id, p.client_id, c.trade_name, c.name as client_name, p.name as project_name
      FROM public.project_tasks t
      JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.clients c ON c.id = p.client_id
      WHERE t.id = $1
      `,
      [taskId]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    const task = taskRes.rows[0];

    const sessionRes = await query(
      `SELECT * FROM public.client_briefing_sessions WHERE task_id = $1 OR project_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [taskId, task.project_id]
    );

    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: "Sessão de briefing não encontrada para resetar." }, { status: 404 });
    }

    const session = sessionRes.rows[0];
    const companyName = session.company_name || task.trade_name || task.client_name || "sua empresa";
    const contactName = session.contact_name || "Parceiro";

    // Preservar categoria e o que vende nas notas e extracted_identity
    let ext: Record<string, unknown> = {};
    try {
      ext = typeof session.extracted_identity === "string" ? JSON.parse(session.extracted_identity) : (session.extracted_identity || {});
    } catch {
      ext = {};
    }

    const preservedExt: Record<string, unknown> = {};
    if (ext.marketNiche) preservedExt.marketNiche = ext.marketNiche;
    if (ext.valueProposition) preservedExt.valueProposition = ext.valueProposition;

    const initialMessage = {
      id: "msg_intro",
      sender: "assistant",
      text: `Olá, ${contactName}! 👋 Sou a Edivânia, estrategista de comunicação aqui da Otimizza.\n\nA nossa equipe me passou o contexto inicial da ${companyName} e estou aqui para bater um papo leve com você sobre o posicionamento e as redes sociais da sua marca.\n\nFique super tranquilo: não é um teste e nem um questionário engessado! Se em algum momento você quiser sugestões ou quiser continuar mais tarde, basta me avisar.\n\nPodemos começar agora?`,
      options: [
        { label: "🚀 Sim, vamos começar!", value: "START", action: "APPROVE" },
        { label: "Como vai funcionar?", value: "EXPLAIN", action: "EXPLAIN" },
      ],
      timestamp: new Date().toISOString(),
    };

    const resetRes = await query(
      `
      UPDATE public.client_briefing_sessions
      SET 
        conversation_history = $1,
        extracted_identity = $2,
        status = 'IN_PROGRESS',
        progress_percent = 15,
        credentials_saved = false,
        completed_at = NULL,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [JSON.stringify([initialMessage]), JSON.stringify(preservedExt), session.id]
    );

    return NextResponse.json({
      success: true,
      message: "Chat da Edivânia resetado com sucesso!",
      session: resetRes.rows[0],
    });
  } catch (err: unknown) {
    console.error("Erro ao resetar chat da Edivânia:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno ao resetar chat." },
      { status: 500 }
    );
  }
}
