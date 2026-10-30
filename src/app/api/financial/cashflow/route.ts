import { NextResponse } from "next/server";
import { getCashflowReport, getProfitabilityReport } from "@/modules/financial/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "profitability") {
      const profitability = await getProfitabilityReport();
      return NextResponse.json({ profitability });
    }

    const startDate = searchParams.get("startDate") || `${new Date().getFullYear()}-01-01`;
    const endDate = searchParams.get("endDate") || `${new Date().getFullYear()}-12-31`;
    const accountId = searchParams.get("accountId") || undefined;

    const cashflow = await getCashflowReport({ startDate, endDate, accountId });
    return NextResponse.json(cashflow);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao gerar fluxo de caixa.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
