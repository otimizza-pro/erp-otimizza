import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import {
  getExecutiveKpis,
  getMonthlyEvolution,
  getServiceProfitabilityReport,
  getComboProfitabilityReport,
  getClientProfitabilityReport,
  getReceivablesDefaultReport,
  getDashboardPreferences,
  saveDashboardPreferences,
} from "@/modules/analytics/service";

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await requireAdminUser();
    } catch {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "kpis";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    if (type === "kpis") {
      const kpis = await getExecutiveKpis({ startDate, endDate });
      return NextResponse.json(kpis);
    }

    if (type === "evolution") {
      const months = parseInt(searchParams.get("months") || "6", 10);
      const evolution = await getMonthlyEvolution(months);
      return NextResponse.json(evolution);
    }

    if (type === "services_profitability") {
      const data = await getServiceProfitabilityReport({ startDate, endDate });
      return NextResponse.json(data);
    }

    if (type === "combos_profitability") {
      const data = await getComboProfitabilityReport();
      return NextResponse.json(data);
    }

    if (type === "clients_profitability") {
      const data = await getClientProfitabilityReport();
      return NextResponse.json(data);
    }

    if (type === "receivables_default") {
      const onlyOverdue = searchParams.get("onlyOverdue") === "true";
      const data = await getReceivablesDefaultReport({ onlyOverdue, startDate, endDate });
      return NextResponse.json(data);
    }

    if (type === "preferences") {
      const prefs = await getDashboardPreferences(user.id);
      return NextResponse.json(prefs);
    }

    return NextResponse.json({ error: "Tipo de relatório não suportado." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao carregar dados analíticos.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await requireAdminUser();
    } catch {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await request.json();
    if (body.action === "save_preferences") {
      if (!body.preferences) {
        return NextResponse.json({ error: "Preferências são obrigatórias." }, { status: 400 });
      }
      await saveDashboardPreferences(user.id, body.preferences);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro na operação analítica.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
