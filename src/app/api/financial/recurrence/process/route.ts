import { NextResponse } from "next/server";
import { processContractRecurrence, processPayableRecurrence } from "@/modules/financial/service";
import { requireAdminUser } from "@/lib/auth/require-auth";

export async function POST(request: Request) {
  try {
    // 1. Verificação de segurança: autorização por Bearer Token de Cron ou usuário autenticado
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      try {
        await requireAdminUser();
      } catch {
        return NextResponse.json({ error: "Acesso não autorizado. Chave de cron ou login administrativo exigidos." }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const competencyParam = searchParams.get("competency");
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, "0");
    const competency = competencyParam || `${now.getFullYear()}-${currentMonthStr}`;

    const [recResult, payResult] = await Promise.all([
      processContractRecurrence(competency),
      processPayableRecurrence(competency),
    ]);

    return NextResponse.json({
      success: true,
      competency,
      receivables: recResult,
      payables: payResult,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao processar motor de recorrência.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
