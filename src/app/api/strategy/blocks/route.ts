import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    if (!body.sectionId || !body.blockType || !body.title) {
      return NextResponse.json({ error: "Campos obrigatórios: sectionId, blockType, title." }, { status: 400 });
    }
    const block = await StrategyService.createBlock(body);
    return NextResponse.json(block, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Erro ao criar bloco." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Campo id do bloco é obrigatório." }, { status: 400 });
    }
    const updated = await StrategyService.updateBlock(body.id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Erro ao atualizar bloco." }, { status: 500 });
  }
}

