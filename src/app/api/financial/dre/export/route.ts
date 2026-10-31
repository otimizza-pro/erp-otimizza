import { NextRequest, NextResponse } from "next/server";
import { getDREStatementForMonth, exportDREStatementToCSV } from "@/modules/financial/dre/service";
import { AccountingMethod } from "@/modules/financial/dre/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const methodParam = searchParams.get("method") || "ACCRUAL";
    const method: AccountingMethod = methodParam === "CASH" ? "CASH" : "ACCRUAL";
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const competency = searchParams.get("competency") || `${currentYear}-${currentMonth}`;
    const costCenterId = searchParams.get("costCenterId") || undefined;

    const statement = await getDREStatementForMonth({
      competency,
      accountingMethod: method,
      costCenterId,
    });

    const csvContent = exportDREStatementToCSV(statement);
    const filename = `DRE_${competency}_${method}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao exportar DRE:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao exportar DRE." },
      { status: 500 }
    );
  }
}
