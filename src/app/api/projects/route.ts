import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/modules/projects/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const contractId = searchParams.get("contractId") || undefined;
    const status = searchParams.get("status") || undefined;
    const projectType = searchParams.get("projectType") || undefined;
    const search = searchParams.get("search") || undefined;
    const filter = searchParams.get("filter") || undefined;

    const projects = await listProjects({
      clientId,
      contractId,
      status,
      projectType,
      search,
      filter,
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error: unknown) {
    console.error("Erro ao listar projetos:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar projetos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await createProject(body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao criar projeto." },
      { status: 400 }
    );
  }
}
