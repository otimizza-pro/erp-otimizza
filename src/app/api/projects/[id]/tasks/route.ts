import { NextRequest, NextResponse } from "next/server";
import { createProjectTask } from "@/modules/projects/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const task = await createProjectTask({
      ...body,
      projectId: id,
    });
    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar tarefa do projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao criar tarefa." },
      { status: 400 }
    );
  }
}
