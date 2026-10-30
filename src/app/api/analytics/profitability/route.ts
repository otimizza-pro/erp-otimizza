import { NextResponse } from "next/server";
import { SupplierService } from "@/modules/suppliers/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const competency = searchParams.get("competency") || currentMonth;

    const data = await SupplierService.getManagerialProfitabilityReport(competency);
    return NextResponse.json({
      competency,
      items: data,
      totals: {
        totalRecognizedRevenue: data.reduce((acc, i) => acc + (i.recognizedRevenue || 0), 0),
        totalInvoicedRevenue: data.reduce((acc, i) => acc + (i.invoicedRevenue || 0), 0),
        totalReceivedRevenue: data.reduce((acc, i) => acc + (i.receivedRevenue || 0), 0),
        totalEstimatedCost: data.reduce((acc, i) => acc + (i.estimatedDirectCost || 0), 0),
        totalAccruedCost: data.reduce((acc, i) => acc + (i.accruedRealCost || 0), 0),
        totalUnclassifiedLegacyCost: data.reduce((acc, i) => acc + (i.unclassifiedLegacyCost || 0), 0),
        estimatedGrossMargin: data.reduce((acc, i) => acc + (i.estimatedGrossMargin || 0), 0),
        realizedGrossMargin: data.reduce((acc, i) => acc + (i.realizedGrossMargin || 0), 0),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar relatório de rentabilidade gerencial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
