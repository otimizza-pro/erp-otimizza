import { NextResponse } from "next/server";
import { processAllRecurringProjects } from "@/modules/projects/service";
import { requireAdminUser } from "@/lib/auth/require-auth";

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
        return NextResponse.json(
          { error: "Acesso não autorizado. Chave de cron ou login administrativo exigidos." },
          { status: 401 }
        );
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

    const result = await processAllRecurringProjects(competency);

    return NextResponse.json({
      success: result.errors.length === 0,
      result,
    }, {status:result.errors.length ? 500 : 200});
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao processar recorrência de projetos.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
