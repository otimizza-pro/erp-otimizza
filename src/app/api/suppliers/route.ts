import { NextResponse } from "next/server";
import { SupplierService } from "@/modules/suppliers/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const status = (searchParams.get("status") as "ACTIVE" | "ARCHIVED" | "ALL") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await SupplierService.listSuppliers({ search, category, status, limit, offset });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao listar fornecedores.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supplier = await SupplierService.createSupplier(body);
    return NextResponse.json(supplier, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar fornecedor.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
