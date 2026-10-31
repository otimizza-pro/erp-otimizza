import { NextResponse } from "next/server";
import { ProposalService } from "@/modules/proposals/service";
import { CreateProposalInputSchema, ProposalStatus } from "@/modules/proposals/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const leadId = searchParams.get("leadId") || undefined;
    const opportunityId = searchParams.get("opportunityId") || undefined;
    const status = (searchParams.get("status") as ProposalStatus) || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await ProposalService.listProposals({
      search,
      clientId,
      leadId,
      opportunityId,
      status,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar propostas comerciais.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateProposalInputSchema.safeParse(body);
    if (!parsed.success) {
      const errMessage = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: `Dados inválidos: ${errMessage}` }, { status: 400 });
    }

    const proposal = await ProposalService.createProposal(parsed.data);
    return NextResponse.json(proposal, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar proposta comercial.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
