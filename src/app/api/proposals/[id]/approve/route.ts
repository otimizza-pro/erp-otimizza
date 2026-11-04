import { withTransaction } from "@/lib/db/pool";
import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";
import { ApproveProposalInputSchema } from "@/modules/proposals/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = ApproveProposalInputSchema.safeParse(body);
    if (!parsed.success) {
      const errMessage = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${errMessage}` }, { status: 400 });
    }

    const approved = await withTransaction(async client => {
      const proposal = await ProposalService.approveProposal(id, parsed.data, client);
      const result = await ProposalService.convertToContract(id, { idempotencyKey: `approved_${id}`, dueDay: 10 }, client);
      return { ...proposal, contractId: result.contracts[0]?.id };
    });
    return NextResponse.json(approved);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao aprovar proposta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
