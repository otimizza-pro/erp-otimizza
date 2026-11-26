import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { createProductionTaskSchema } from "@/modules/production-tasks/schemas";
import { createProductionTask, listProductionTasks } from "@/modules/production-tasks/service";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await listProductionTasks({
      status: searchParams.get("status") || undefined,
      taskType: searchParams.get("taskType") || undefined,
      clientId: searchParams.get("clientId") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      dueFrom: searchParams.get("dueFrom") || undefined,
      dueTo: searchParams.get("dueTo") || undefined,
      search: searchParams.get("search") || undefined,
      archived: searchParams.get("archived") === "true",
      highlightId: searchParams.get("highlightId") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar tarefas de produção." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const parsed = createProductionTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos para tarefa de produção.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const item = await createProductionTask(parsed.data);
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao criar tarefa de produção.";
    const status = msg.includes("já possui") ? 409 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
