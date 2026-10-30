import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await CrmService.listOpportunityHistory(id);
    return NextResponse.json(history);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar histórico da oportunidade.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
