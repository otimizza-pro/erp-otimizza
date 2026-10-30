import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const opp = await CrmService.getOpportunityById(id);
    if (!opp) {
      return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });
    }
    return NextResponse.json(opp);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar oportunidade.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await CrmService.updateOpportunity(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar oportunidade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
