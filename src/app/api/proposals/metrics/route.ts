import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";

export async function GET() {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const metrics = await ProposalService.getProposalMetrics();
    return NextResponse.json(metrics);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar métricas de propostas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
