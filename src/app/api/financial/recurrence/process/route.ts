import { NextResponse } from "next/server";
import { processContractRecurrence, processPayableRecurrence } from "@/modules/financial/service";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { NotificationService } from "@/modules/notifications/service";
import { syncOperationalAlerts } from "@/modules/notifications/alerts-sync";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({error:"Acesso não autorizado."},{status:401});
  }
  return POST(request);
}

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
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competency)) {
      return NextResponse.json({error:"Competência inválida. Use AAAA-MM."},{status:400});
    }

    const [recResult, payResult] = await Promise.all([
      processContractRecurrence(competency),
      processPayableRecurrence(competency),
    ]);

    const errorsCount = (recResult.errors?.length ?? 0) + (payResult.errors?.length ?? 0);
    if (errorsCount > 0) {
      await NotificationService.createSafeNotification({
        type: "FINANCIAL_RECURRENCE_ERROR",
        severity: "critical",
        category: "FINANCIAL",
        dedupKey: `fin-recurrence-err:${competency}`,
        title: `Falha na recorrência financeira (${competency})`,
        message: `${errorsCount} item(ns) falharam ao gerar recorrência`,
        linkUrl: "/financial/receivables",
      });
    } else if (recResult.createdCount > 0 || payResult.createdCount > 0) {
      await NotificationService.createSafeNotification({
        type: "FINANCIAL_RECURRENCE_OK",
        severity: "info",
        category: "FINANCIAL",
        dedupKey: `fin-recurrence-ok:${competency}`,
        title: `Recorrência processada (${competency})`,
        message: `${recResult.createdCount} recebíveis e ${payResult.createdCount} despesas geradas`,
        linkUrl: "/financial/cashflow",
      });
    }
    await syncOperationalAlerts(true);

    return NextResponse.json({
      success: errorsCount === 0,
      competency,
      receivables: recResult,
      payables: payResult,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao processar motor de recorrência.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
