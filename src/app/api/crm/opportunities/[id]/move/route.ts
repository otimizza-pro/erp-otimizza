import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await CrmService.moveOpportunity({
      opportunityId: id,
      toStageId: body.toStageId,
      toPipelineId: body.toPipelineId,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao movimentar oportunidade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
