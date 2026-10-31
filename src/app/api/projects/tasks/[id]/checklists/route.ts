import { NextRequest, NextResponse } from "next/server";
import { addChecklistItem } from "@/modules/projects/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await addChecklistItem({
      taskId: id,
      title: body.title,
      orderIndex: body.orderIndex || 1,
    });
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao adicionar checklist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao adicionar checklist." },
      { status: 400 }
    );
  }
}
