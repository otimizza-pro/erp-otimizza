import { NextRequest, NextResponse } from "next/server";
import { getCostCenters, createCostCenter } from "@/modules/financial/dre/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const costCenters = await getCostCenters(includeArchived);
    return NextResponse.json({ success: true, data: costCenters });
  } catch (error: unknown) {
    console.error("Erro ao listar centros de custo:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar centros de custo." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await createCostCenter(body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar centro de custo:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao criar centro de custo." },
      { status: 400 }
    );
  }
}
