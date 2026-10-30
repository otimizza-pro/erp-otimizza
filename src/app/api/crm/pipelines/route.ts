import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const pipelines = await CrmService.listPipelines(includeArchived);
    return NextResponse.json(pipelines);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar funis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pipeline = await CrmService.createPipeline(body);
    return NextResponse.json(pipeline, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar funil.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
