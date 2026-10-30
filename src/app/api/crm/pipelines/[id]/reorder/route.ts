import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";
import { ReorderStagesSchema } from "@/modules/crm/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = ReorderStagesSchema.parse({
      pipelineId: id,
      stageOrders: body.stageOrders,
    });
    await CrmService.reorderStages(validated.pipelineId, validated.stageOrders);
    return NextResponse.json({ success: true, message: "Etapas reordenadas com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao reordenar etapas.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
