import { NextResponse } from "next/server";
import { listFinancialAccounts, createFinancialAccount, transferBetweenAccounts } from "@/modules/financial/service";

export async function GET() {
  try {
    const accounts = await listFinancialAccounts();
    return NextResponse.json({ accounts });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao listar contas financeiras.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "transfer") {
      if (!body.fromAccountId || !body.toAccountId || !body.amount || !body.date) {
        return NextResponse.json({ error: "Dados da transferência incompletos." }, { status: 400 });
      }
      const res = await transferBetweenAccounts({
        fromAccountId: body.fromAccountId,
        toAccountId: body.toAccountId,
        amount: Number(body.amount),
        date: body.date,
        description: body.description,
      });
      return NextResponse.json(res);
    }

    if (!body.name || !body.accountType) {
      return NextResponse.json({ error: "Nome e tipo de conta são obrigatórios." }, { status: 400 });
    }

    const acc = await createFinancialAccount({
      name: body.name,
      bankName: body.bankName,
      accountType: body.accountType,
      initialBalance: Number(body.initialBalance || 0),
    });
    return NextResponse.json(acc, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao operar conta financeira.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
