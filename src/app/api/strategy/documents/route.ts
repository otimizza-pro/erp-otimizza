import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";
import { StrategySeedService } from "@/modules/strategy/seed";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "ALL";

    // Garante que o banco esteja semeado se ainda estiver vazio
    await StrategySeedService.seedAll();

    const docs = await StrategyService.listDocuments(category);
    return NextResponse.json(docs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar documentos estratégicos." }, { status: 500 });
  }
}

