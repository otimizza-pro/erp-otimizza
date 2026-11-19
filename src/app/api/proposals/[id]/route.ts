import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await context.params;
    const proposal = await ProposalService.getProposalById(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
    }
    return NextResponse.json(proposal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar proposta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await context.params;
    await ProposalService.deleteProposal(id);
    return NextResponse.json({ success: true, message: "Proposta excluída com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir proposta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
