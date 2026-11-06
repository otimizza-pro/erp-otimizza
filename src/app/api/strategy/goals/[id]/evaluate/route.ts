import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start") || undefined;
    const end = searchParams.get("end") || undefined;

    const evaluation = await StrategyService.evaluateGoal(id, start, end);
    return NextResponse.json(evaluation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao avaliar meta." }, { status: 500 });
  }
}

