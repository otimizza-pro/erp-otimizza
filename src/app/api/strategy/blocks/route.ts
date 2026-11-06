import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.sectionId || !body.blockType || !body.title) {
      return NextResponse.json({ error: "Campos obrigatórios: sectionId, blockType, title." }, { status: 400 });
    }
    const block = await StrategyService.createBlock(body);
    return NextResponse.json(block, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar bloco." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Campo id do bloco é obrigatório." }, { status: 400 });
    }
    const updated = await StrategyService.updateBlock(body.id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar bloco." }, { status: 500 });
  }
}

