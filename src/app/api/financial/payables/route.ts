import { NextResponse } from "next/server";
import { listPayables, createPayable } from "@/modules/financial/service";
import { FinancialStatus } from "@/modules/financial/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierName = searchParams.get("supplierName") || undefined;
    const competency = searchParams.get("competency") || undefined;
    const statusParam = searchParams.get("status");
    const status = statusParam ? (statusParam as FinancialStatus) : undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await listPayables({ supplierName, competency, status, search, limit, offset });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao listar contas a pagar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.supplierName || !body.description || !body.competency || !body.dueDate || !body.originalAmount) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
    }
    const pay = await createPayable(body);
    return NextResponse.json(pay, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao cadastrar conta a pagar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
