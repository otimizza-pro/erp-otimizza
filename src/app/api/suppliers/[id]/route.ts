import { NextResponse } from "next/server";
import { SupplierService } from "@/modules/suppliers/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await SupplierService.getSupplierById(id);
    if (!supplier) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }
    return NextResponse.json(supplier);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao consultar fornecedor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await SupplierService.updateSupplier(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar fornecedor.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.action === "archive") {
      const archived = await SupplierService.archiveSupplier(id);
      return NextResponse.json(archived);
    } else if (body.action === "reactivate") {
      const reactivated = await SupplierService.reactivateSupplier(id);
      return NextResponse.json(reactivated);
    }
    return NextResponse.json({ error: "Ação inválida. Utilize 'archive' ou 'reactivate'." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro na operação de fornecedor.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
