import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { rescheduleProductionTaskSchema } from "@/modules/production-tasks/schemas";
import { rescheduleProductionTask } from "@/modules/production-tasks/service";

export async function POST(
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
    const parsed = rescheduleProductionTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Informe a nova data e o motivo." }, { status: 400 });
    }
    const item = await rescheduleProductionTask(id, parsed.data);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao reagendar tarefa de produção.";
    return NextResponse.json({ success: false, error: msg }, { status: msg.includes("não encontrada") ? 404 : 500 });
  }
}
