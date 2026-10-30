import { NextResponse } from "next/server";
import { listReceivables, createReceivable } from "@/modules/financial/service";
import { FinancialStatus } from "@/modules/financial/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") || undefined;
    const contractId = searchParams.get("contractId") || undefined;
    const competency = searchParams.get("competency") || undefined;
    const statusParam = searchParams.get("status");
    const status = statusParam ? (statusParam as FinancialStatus) : undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await listReceivables({ clientId, contractId, competency, status, search, limit, offset });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao listar contas a receber.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.clientId || !body.description || !body.competency || !body.dueDate || !body.originalAmount) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
    }
    const rec = await createReceivable(body);
    return NextResponse.json(rec, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao cadastrar conta a receber.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
