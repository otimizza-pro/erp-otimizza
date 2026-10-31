import { NextResponse } from "next/server";
import { getManagerialAccounts } from "@/modules/financial/dre/service";

export async function GET() {
  try {
    const accounts = await getManagerialAccounts();
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: unknown) {
    console.error("Erro ao listar contas gerenciais:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar plano gerencial." },
      { status: 500 }
    );
  }
}
