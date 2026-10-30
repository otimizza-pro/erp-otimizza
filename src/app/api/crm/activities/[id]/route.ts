import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await CrmService.updateActivity(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar atividade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await CrmService.deleteActivity(id);
    return NextResponse.json({ success: true, message: "Atividade excluída com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir atividade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
