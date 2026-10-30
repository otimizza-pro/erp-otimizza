import { NextResponse } from "next/server";
import { listContracts, createContract } from "@/modules/contracts/service";
import { ContractStatus } from "@/modules/contracts/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const status = (searchParams.get("status") as ContractStatus) || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await listContracts({ search, clientId, status, limit, offset });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao listar contratações.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.clientId || !body.title || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Cliente, título e pelo menos um item são obrigatórios." },
        { status: 400 }
      );
    }

    const contract = await createContract(body);
    return NextResponse.json(contract, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar contratação.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
