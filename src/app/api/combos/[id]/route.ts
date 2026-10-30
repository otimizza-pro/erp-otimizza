import { NextResponse } from "next/server";
import { getComboById, archiveCombo, reactivateCombo, deleteCombo } from "@/modules/catalog/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getComboById(id);
    if (!item) {
      return NextResponse.json({ error: "Combo não encontrado." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar combo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.action === "ARCHIVE") {
      await archiveCombo(id);
      return NextResponse.json({ success: true, message: "Combo arquivado." });
    }
    if (body.action === "REACTIVATE") {
      await reactivateCombo(id);
      return NextResponse.json({ success: true, message: "Combo reativado." });
    }
    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao alterar status do combo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteCombo(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir combo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

