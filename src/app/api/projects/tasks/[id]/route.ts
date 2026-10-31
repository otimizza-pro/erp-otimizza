import { NextRequest, NextResponse } from "next/server";
import { updateProjectTask, deleteProjectTask } from "@/modules/projects/service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateProjectTask(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar tarefa." },
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
    await deleteProjectTask(id);
    return NextResponse.json({ success: true, message: "Tarefa excluída com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir tarefa:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir tarefa." },
      { status: 400 }
    );
  }
}
