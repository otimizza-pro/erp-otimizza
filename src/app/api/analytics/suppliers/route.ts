import { NextResponse } from "next/server";
import { SupplierService } from "@/modules/suppliers/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "expenses";
    const supplierId = searchParams.get("supplierId") || undefined;
    const status = searchParams.get("status") || undefined;

    if (type === "contracted" && supplierId) {
      const data = await SupplierService.getSupplierContractedServicesReport(supplierId);
      return NextResponse.json(data);
    }

    if (type === "payables") {
      const data = await SupplierService.getSupplierPayableReport({ supplierId, status });
      return NextResponse.json(data);
    }

    // Default: expenses summary
    const data = await SupplierService.getSupplierExpenseReport();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar relatório de fornecedores.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
