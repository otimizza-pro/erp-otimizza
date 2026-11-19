import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await CrmService.reopenOpportunity(id, body.toStageId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao reabrir oportunidade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
