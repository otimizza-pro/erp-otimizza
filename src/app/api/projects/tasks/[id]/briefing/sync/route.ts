import { NextRequest, NextResponse } from "next/server";
import {syncBriefingIdentity} from "@/modules/clients/briefing-identity";
import { query,withTransaction } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: taskId } = await params;

    // Obter payload opcional com dados do formulário
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Buscar a sessão vinculada à tarefa ou ao projeto
    const res = await query<{
      session_id: string;
      client_id: string | null;
      extracted_identity: Record<string, unknown>;
      company_name: string;
      instagram_url: string | null;
      website_url: string | null;
      initial_notes: string | null;
      competitor_notes: string | null;
    }>(
      `
      SELECT 
        s.id as session_id,
        COALESCE(s.client_id, p.client_id) as client_id,
        s.extracted_identity,
        COALESCE($2, s.company_name) as company_name,
        COALESCE($3, s.instagram_url) as instagram_url,
        COALESCE($4, s.website_url) as website_url,
        COALESCE($5, s.initial_notes) as initial_notes,
        COALESCE($6, s.competitor_notes) as competitor_notes
      FROM public.project_tasks t
      JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.client_briefing_sessions s ON (s.task_id = t.id OR s.project_id = p.id)
      WHERE t.id = $1
      ORDER BY s.created_at DESC NULLS LAST
      LIMIT 1
      `,
      [
        taskId,
        body.companyName || null,
        body.instagramUrl || null,
        body.websiteUrl || null,
        body.initialNotes || null,
        body.competitorNotes || null,
      ]
    );

    if (res.rows.length === 0 || !res.rows[0].client_id) {
      return NextResponse.json({
        error: "Este projeto não possui um cliente associado na base do ERP para vincular a identidade."
      }, { status: 400 });
    }

    const {
      session_id,
      client_id,
      extracted_identity,
      instagram_url,
      website_url,
      initial_notes,
      competitor_notes
    } = res.rows[0];

    await withTransaction(async client=>{
      const ext={...(extracted_identity||{})};
      if(typeof body.valueProposition==="string"&&body.valueProposition.trim())ext.valueProposition=body.valueProposition;
      if(typeof body.marketNiche==="string"&&body.marketNiche.trim())ext.marketNiche=body.marketNiche;
      await syncBriefingIdentity(client,client_id,ext,{instagram:instagram_url||"",website:website_url||"",notes:[initial_notes,competitor_notes?"Referências: "+competitor_notes:""].filter(Boolean).join("\n")});
      if(session_id)await client.query("UPDATE client_briefing_sessions SET status='COMPLETED',progress_percent=100,completed_at=COALESCE(completed_at,NOW()) WHERE id=$1",[session_id]);
      await client.query("UPDATE project_tasks SET status='DONE',completed_at=NOW() WHERE id=$1",[taskId]);
    });

    return NextResponse.json({
      success: true,
      message: "Identidade do cliente sincronizada com sucesso e tarefa concluída!",
    });
  } catch (err: unknown) {
    console.error("Erro ao sincronizar briefing:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
