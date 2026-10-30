import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const stage = await CrmService.createStage(body);
    return NextResponse.json(stage, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar etapa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
