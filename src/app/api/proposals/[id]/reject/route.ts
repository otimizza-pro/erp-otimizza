import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";
import { RejectProposalInputSchema } from "@/modules/proposals/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = RejectProposalInputSchema.safeParse(body);
    if (!parsed.success) {
      const errMessage = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${errMessage}` }, { status: 400 });
    }

    const proposal = await ProposalService.rejectProposal(id, parsed.data);
    return NextResponse.json(proposal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao rejeitar proposta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
