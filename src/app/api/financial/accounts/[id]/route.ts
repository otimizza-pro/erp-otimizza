import { NextResponse } from "next/server";
import {
  getFinancialAccountById,
  updateFinancialAccount,
  deleteFinancialAccount,
} from "@/modules/financial/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await getFinancialAccountById(id);
    if (!account) {
      return NextResponse.json({ error: "Conta financeira não encontrada." }, { status: 404 });
    }
    return NextResponse.json(account);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao buscar conta financeira.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await updateFinancialAccount(id, {
      name: body.name,
      bankName: body.bankName,
      accountType: body.accountType,
      status: body.status,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao atualizar conta financeira.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await deleteFinancialAccount(id);
    return NextResponse.json(res);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao excluir conta financeira.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
