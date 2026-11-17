import { NextRequest, NextResponse } from "next/server";
import { getProjectById, updateProject, archiveProject, deleteProject } from "@/modules/projects/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Projeto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: project });
  } catch (error: unknown) {
    console.error("Erro ao buscar projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar projeto." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateProject(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Erro ao atualizar projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar projeto." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const archiveOnly = searchParams.get("archive") === "true";

    if (archiveOnly) {
      await archiveProject(id);
      return NextResponse.json({ success: true, message: "Projeto arquivado com sucesso." });
    } else {
      await deleteProject(id);
      return NextResponse.json({ success: true, message: "Projeto excluído com sucesso." });
    }
  } catch (error: unknown) {
    console.error("Erro ao excluir/arquivar projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir/arquivar projeto." },
      { status: 400 }
    );
  }
}
