import { NextResponse } from "next/server";
import { getClientById, updateClient, archiveClient, reactivateClient } from "@/modules/clients/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar cliente.";
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
    const client = await updateClient(id, body);
    return NextResponse.json(client);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar cliente.";
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
    if (body.action === "ARCHIVE") {
      const client = await archiveClient(id);
      return NextResponse.json(client);
    }
    if (body.action === "REACTIVATE") {
      const client = await reactivateClient(id);
      return NextResponse.json(client);
    }
    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao alterar status do cliente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
