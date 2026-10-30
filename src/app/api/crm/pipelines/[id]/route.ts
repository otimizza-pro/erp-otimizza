import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pipeline = await CrmService.getPipelineById(id);
    if (!pipeline) {
      return NextResponse.json({ error: "Funil não encontrado." }, { status: 404 });
    }
    return NextResponse.json(pipeline);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar funil.";
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
    const updated = await CrmService.updatePipeline(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar funil.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await CrmService.archivePipeline(id);
    return NextResponse.json({ success: true, message: "Funil arquivado com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao arquivar funil.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
