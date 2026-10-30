import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await CrmService.closeOpportunity({
      opportunityId: id,
      status: body.status,
      lostReason: body.lostReason,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao encerrar oportunidade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
