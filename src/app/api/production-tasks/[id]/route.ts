import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { updateProductionTaskSchema } from "@/modules/production-tasks/schemas";
import { deleteProductionTask, updateProductionTask } from "@/modules/production-tasks/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = updateProductionTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos." }, { status: 400 });
    }
    const item = await updateProductionTask(id, parsed.data);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao atualizar tarefa de produção.";
    return NextResponse.json({ success: false, error: msg }, { status: msg.includes("não encontrada") ? 404 : 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteProductionTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao excluir tarefa de produção.";
    return NextResponse.json({ success: false, error: msg }, { status: msg.includes("não encontrada") ? 404 : 500 });
  }
}
