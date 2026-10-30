import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await CrmService.getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar lead.";
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
    const updated = await CrmService.updateLead(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await CrmService.archiveLead(id);
    return NextResponse.json({ success: true, message: "Lead arquivado com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao arquivar lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
