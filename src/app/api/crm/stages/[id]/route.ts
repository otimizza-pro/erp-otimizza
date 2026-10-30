import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await CrmService.updateStage(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar etapa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const relocateTo = searchParams.get("relocateTo") || undefined;
    await CrmService.updateStage(id, {
      status: "ARCHIVED",
      relocateOpportunitiesToStageId: relocateTo,
    });
    return NextResponse.json({ success: true, message: "Etapa arquivada com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao arquivar etapa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
