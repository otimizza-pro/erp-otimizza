import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { searchParams } = new URL(request.url);
    const rawPipelineId = searchParams.get("pipelineId");
    const pipelineId = rawPipelineId ? z.string().uuid().parse(rawPipelineId) : undefined;
    const kpis = await CrmService.getCrmKpis(pipelineId);
    return NextResponse.json(kpis);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Identificador de funil inválido." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao carregar indicadores do CRM.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
