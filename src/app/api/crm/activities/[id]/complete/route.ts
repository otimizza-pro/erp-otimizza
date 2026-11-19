import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    await CrmService.completeActivity(id);
    return NextResponse.json({ success: true, message: "Atividade concluída com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao concluir atividade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
