import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";
import { OpportunityStatus } from "@/modules/crm/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("pipelineId") || undefined;
    const stageId = searchParams.get("stageId") || undefined;
    const status = (searchParams.get("status") as OpportunityStatus | "ALL") || undefined;
    const leadId = searchParams.get("leadId") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await CrmService.listOpportunities({
      pipelineId,
      stageId,
      status,
      leadId,
      clientId,
      search,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar oportunidades.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const opportunity = await CrmService.createOpportunity(body);
    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar oportunidade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
