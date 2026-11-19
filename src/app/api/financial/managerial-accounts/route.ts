import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { getManagerialAccounts } from "@/modules/financial/dre/service";

export async function GET() {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

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
