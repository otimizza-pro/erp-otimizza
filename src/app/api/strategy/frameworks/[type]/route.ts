import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const fw = await StrategyService.getFramework(type.toUpperCase());
    return NextResponse.json(fw);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar framework." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const body = await request.json();
    const saved = await StrategyService.saveFramework(type.toUpperCase(), body.title || type, body.content || {});
    return NextResponse.json(saved);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao salvar framework." }, { status: 500 });
  }
}

