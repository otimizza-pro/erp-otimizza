import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";
import { ConvertProposalToContractInputSchema } from "@/modules/proposals/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = ConvertProposalToContractInputSchema.safeParse(body);
    if (!parsed.success) {
      const errMessage = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${errMessage}` }, { status: 400 });
    }

    const result = await ProposalService.convertToContract(id, parsed.data);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao converter proposta em contrato.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
