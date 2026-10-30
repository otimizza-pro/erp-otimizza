import { NextResponse } from "next/server";
import { listClients, createClient } from "@/modules/clients/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as "ACTIVE" | "ARCHIVED") || undefined;
    const type = (searchParams.get("type") as "PF" | "PJ") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await listClients({ search, status, type, limit, offset });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao listar clientes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: "Nome e Tipo (PF ou PJ) são obrigatórios." },
        { status: 400 }
      );
    }

    const client = await createClient(body);
    return NextResponse.json(client, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar cliente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
