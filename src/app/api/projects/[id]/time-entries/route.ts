import { NextRequest, NextResponse } from "next/server";
import { getProjectTimeEntries, addProjectTimeEntry } from "@/modules/projects/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = await getProjectTimeEntries(id);
    return NextResponse.json({ success: true, data: entries });
  } catch (error: unknown) {
    console.error("Erro ao listar apontamentos de horas:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar horas." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const entry = await addProjectTimeEntry({
      ...body,
      projectId: id,
    });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao registrar horas do projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao registrar horas." },
      { status: 400 }
    );
  }
}
