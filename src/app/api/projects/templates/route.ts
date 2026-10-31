import { NextResponse } from "next/server";
import { listProjectTemplates } from "@/modules/projects/service";

export async function GET() {
  try {
    const templates = await listProjectTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error: unknown) {
    console.error("Erro ao listar modelos de projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar templates." },
      { status: 500 }
    );
  }
}
