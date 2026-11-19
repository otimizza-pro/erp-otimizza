import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { listProjectTemplates } from "@/modules/projects/service";

export async function GET() {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

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
