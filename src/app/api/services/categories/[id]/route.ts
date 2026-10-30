import { NextResponse } from "next/server";
import { updateServiceCategory, deleteServiceCategory } from "@/modules/catalog/service";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const updated = await updateServiceCategory(id, {
      name: body.name,
      description: body.description,
      parentId: body.parentId,
      status: body.status,
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar categoria.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const result = await deleteServiceCategory(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir categoria.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
