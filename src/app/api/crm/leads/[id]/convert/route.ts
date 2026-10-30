import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await CrmService.convertLeadToClient({
      leadId: id,
      mode: body.mode || "NEW_CLIENT",
      existingClientId: body.existingClientId,
      clientDataOverride: body.clientDataOverride,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao converter lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
