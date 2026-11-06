import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const doc = await StrategyService.getDocumentByCode(code);
    if (!doc) {
      return NextResponse.json({ error: "Documento estratégico não encontrado." }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar documento." }, { status: 500 });
  }
}

