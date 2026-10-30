import { NextResponse } from "next/server";
import { getReceivableById, settleReceivable, deleteReceivable } from "@/modules/financial/service";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const receivable = await getReceivableById(id);
    if (!receivable) {
      return NextResponse.json({ error: "Título não encontrado." }, { status: 404 });
    }
    return NextResponse.json(receivable);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao buscar título.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    if (body.action === "settle") {
      if (!body.financialAccountId || !body.amount || !body.settlementDate) {
        return NextResponse.json({ error: "Conta, valor e data de liquidação são obrigatórios." }, { status: 400 });
      }
      const updated = await settleReceivable({
        receivableId: id,
        financialAccountId: body.financialAccountId,
        amount: Number(body.amount),
        settlementDate: body.settlementDate,
        notes: body.notes,
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro na operação de liquidação.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const result = await deleteReceivable(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao excluir título.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

