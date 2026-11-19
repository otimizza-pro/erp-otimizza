import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("pipelineId") || undefined;
    const kpis = await CrmService.getCrmKpis(pipelineId);
    return NextResponse.json(kpis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar indicadores do CRM.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
