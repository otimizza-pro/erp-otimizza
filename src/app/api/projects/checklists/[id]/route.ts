import { NextRequest, NextResponse } from "next/server";
import { toggleChecklistItem, deleteChecklistItem } from "@/modules/projects/service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await toggleChecklistItem(id, Boolean(body.isCompleted));
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Erro ao alterar checklist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao alterar checklist." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteChecklistItem(id);
    return NextResponse.json({ success: true, message: "Item excluído com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir checklist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir checklist." },
      { status: 400 }
    );
  }
}
