import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { completeProductionTask } from "@/modules/production-tasks/service";

export async function POST(
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
    const item = await completeProductionTask(id);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao concluir tarefa de produção.";
    return NextResponse.json({ success: false, error: msg }, { status: msg.includes("não encontrada") ? 404 : 500 });
  }
}
