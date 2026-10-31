import { NextRequest, NextResponse } from "next/server";
import { getPayableAllocations, allocatePayableCostCenters } from "@/modules/financial/dre/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allocations = await getPayableAllocations(id);
    return NextResponse.json({ success: true, data: allocations });
  } catch (error: unknown) {
    console.error("Erro ao obter rateios do contas a pagar:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao obter rateios." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    await allocatePayableCostCenters({
      payableId: id,
      allocations: body.allocations || [],
    });
    const updated = await getPayableAllocations(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Erro ao salvar rateios por centro de custo:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao processar rateios." },
      { status: 400 }
    );
  }
}
