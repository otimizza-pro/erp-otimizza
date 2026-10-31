import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";
import { CreateProposalVersionInputSchema } from "@/modules/proposals/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = CreateProposalVersionInputSchema.safeParse({
      ...body,
      proposalId: id,
    });
    if (!parsed.success) {
      const errMessage = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${errMessage}` }, { status: 400 });
    }

    const version = await ProposalService.createProposalVersion(parsed.data);
    return NextResponse.json(version, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar nova versão da proposta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
