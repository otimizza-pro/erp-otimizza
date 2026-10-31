import { NextRequest, NextResponse } from "next/server";
import { createProjectStage } from "@/modules/projects/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const stage = await createProjectStage(id, body.name, body.orderIndex || 1);
    return NextResponse.json({ success: true, data: stage }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar etapa do projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao criar etapa." },
      { status: 400 }
    );
  }
}
