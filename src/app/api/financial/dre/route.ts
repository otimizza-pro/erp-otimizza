import { NextRequest, NextResponse } from "next/server";
import { getDREStatementForMonth, getDREAnnualStatement } from "@/modules/financial/dre/service";
import { AccountingMethod } from "@/modules/financial/dre/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const methodParam = searchParams.get("method") || "ACCRUAL";
    const method: AccountingMethod = methodParam === "CASH" ? "CASH" : "ACCRUAL";
    const view = searchParams.get("view") || "MONTH";
    const costCenterId = searchParams.get("costCenterId") || undefined;

    if (view === "YEAR") {
      const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
      const statement = await getDREAnnualStatement({
        year,
        accountingMethod: method,
        costCenterId,
      });
      return NextResponse.json({ success: true, data: statement });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const competency = searchParams.get("competency") || `${currentYear}-${currentMonth}`;

    const statement = await getDREStatementForMonth({
      competency,
      accountingMethod: method,
      costCenterId,
    });

    return NextResponse.json({ success: true, data: statement });
  } catch (error: unknown) {
    console.error("Erro ao calcular DRE:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro interno ao processar DRE." },
      { status: 500 }
    );
  }
}
