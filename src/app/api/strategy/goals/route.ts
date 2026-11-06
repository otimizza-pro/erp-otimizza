import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function GET() {
  try {
    const goals = await StrategyService.listGoals();
    return NextResponse.json(goals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar metas." }, { status: 500 });
  }
}

