import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await StrategyService.deleteBlock(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir bloco." }, { status: 500 });
  }
}

