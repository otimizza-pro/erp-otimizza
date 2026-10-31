import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const actor = body.actorName ? { name: body.actorName } : undefined;
    const proposal = await ProposalService.sendProposal(id, actor);
    return NextResponse.json(proposal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao enviar proposta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
