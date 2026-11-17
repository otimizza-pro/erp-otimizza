import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: leadId } = await params;

    // Buscar sessão diretamente pelo lead_id ou através de projetos vinculados ao cliente
    const res = await query(
      `
      SELECT 
        s.*,
        p.name as project_name,
        p.status as project_status,
        t.title as task_title,
        t.status as task_status
      FROM public.client_briefing_sessions s
      LEFT JOIN public.projects p ON p.id = s.project_id
      LEFT JOIN public.project_tasks t ON t.id = s.task_id
      LEFT JOIN public.crm_leads l ON l.id = $1
      WHERE s.lead_id = $1 
         OR (l.client_id IS NOT NULL AND s.client_id = l.client_id)
         OR (l.trade_name ILIKE s.company_name OR l.name ILIKE s.company_name)
      ORDER BY s.updated_at DESC
      LIMIT 1
      `,
      [leadId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: true, session: null });
    }

    return NextResponse.json({
      success: true,
      session: res.rows[0],
    });
  } catch (err: unknown) {
    console.error("Erro ao buscar briefing do lead:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
