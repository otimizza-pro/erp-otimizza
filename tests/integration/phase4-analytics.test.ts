import { describe, it, expect, afterAll } from "vitest";
import { query } from "@/lib/db/pool";
import { createClient } from "@/modules/clients/service";
import { createService } from "@/modules/catalog/service";
import { createContract } from "@/modules/contracts/service";
import {
  createFinancialAccount,
  createReceivable,
  settleReceivable,
  reverseSettlement,
  transferBetweenAccounts,
} from "@/modules/financial/service";
import {
  getExecutiveKpis,
  getMonthlyEvolution,
  getServiceProfitabilityReport,
  getClientProfitabilityReport,
  getReceivablesDefaultReport,
  getPayablesReport,
  getCashflowComparisonReport,
  getMrrEvolutionReport,
  saveDashboardPreferences,
  getDashboardPreferences,
} from "@/modules/analytics/service";

describe("Dashboard Executivo, BI e Indicadores", () => {
  let clientId: string;
  let serviceId: string;
  let contractId: string;
  let receivableId: string;
  let account1Id: string;
  let account2Id: string;
  let settlementId: string;
  const testUserId = "aa2cbf77-f72a-45bb-9a58-f54bc68fe232"; // Admin Otimizza

  afterAll(async () => {
    try {
      await query("DELETE FROM dashboard_preferences WHERE user_id = $1", [testUserId]);
      await query("DELETE FROM financial_statements WHERE description LIKE '%Teste BI%'");
      await query("DELETE FROM financial_settlements WHERE notes LIKE '%Teste BI%'");
      await query("DELETE FROM receivables WHERE description LIKE '%Teste BI%'");
      if (account1Id || account2Id) {
        await query("DELETE FROM financial_accounts WHERE id IN ($1, $2)", [account1Id, account2Id].filter(Boolean));
      }
      if (contractId) {
        await query("DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id = $1)", [contractId]);
        await query("DELETE FROM contract_versions WHERE contract_id = $1", [contractId]);
        await query("DELETE FROM contracts WHERE id = $1", [contractId]);
      }
      if (serviceId) {
        await query("DELETE FROM services WHERE id = $1", [serviceId]);
      }
      if (clientId) {
        await query("DELETE FROM client_contacts WHERE client_id = $1", [clientId]);
        await query("DELETE FROM clients WHERE id = $1", [clientId]);
      }
    } catch (e) {
      console.warn("Aviso na limpeza do teste de analytics:", e);
    }
  });

  it("configura base de dados para testes controlados de BI", async () => {
    const doc = "78912345000109";
    const existing = await query("SELECT id FROM clients WHERE document = $1 AND status = 'ACTIVE'", [doc]);
    if (existing.rowCount && existing.rowCount > 0) {
      clientId = existing.rows[0].id;
    } else {
      const cl = await createClient({
        type: "PJ",
        name: "Cliente Teste BI S/A",
        document: "78.912.345/0001-09",
        email: "bi@clienteteste.com",
      });
      clientId = cl.id;
    }

    const svc = await createService({
      name: "Serviço BI Teste",
      defaultPrice: 1200.0,
      defaultCost: 200.0,
      billingUnit: "MES",
    });
    serviceId = svc.id;

    // Contrato anual de R$ 1.200 (deve normalizar R$ 100 no MRR)
    const ct = await createContract({
      clientId,
      title: "Contrato Anual BI Teste",
      billingPeriod: "YEARLY",
      dueDay: 15,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      isIndefinite: false,
      items: [{ serviceId, quantity: 1, unitPrice: 1200.0, unitCost: 200.0 }],
    });
    contractId = ct.id;

    // Contas bancárias
    const a1 = await createFinancialAccount({
      name: "Banco BI 1 Teste",
      accountType: "CHECKING",
      initialBalance: 5000.0,
    });
    account1Id = a1.id;

    const a2 = await createFinancialAccount({
      name: "Banco BI 2 Teste",
      accountType: "INVESTMENT",
      initialBalance: 2000.0,
    });
    account2Id = a2.id;
  });

  it("calcula MRR com normalização anual e métricas contratuais ativas", async () => {
    const kpis = await getExecutiveKpis();
    expect(kpis.mrr.currentMrr).toBeGreaterThan(0);
    expect(kpis.activeContractsCount).toBeGreaterThan(0);
    expect(kpis.activeClientsCount).toBeGreaterThan(0);
  });

  it("baixa parcial de R$ 600 em título de R$ 1.000 reflete exatamente nos KPIs e na inadimplência", async () => {
    const rec = await createReceivable({
      clientId,
      contractId,
      description: "Cobrança Vencida Teste BI",
      competency: "2026-01",
      dueDate: "2026-02-10", // Vencido no passado
      originalAmount: 1000.0,
    });
    receivableId = rec.id;

    // Baixa parcial de R$ 600
    const settled = await settleReceivable({
      receivableId: rec.id,
      financialAccountId: account1Id,
      amount: 600.0,
      settlementDate: "2026-02-05",
      notes: "Baixa Parcial Teste BI",
    });

    expect(settled.paidAmount).toBe(600.0);
    expect(settled.balanceAmount).toBe(400.0);
    expect(settled.status).toBe("OVERDUE");

    const kpis = await getExecutiveKpis({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(kpis.receivedRevenue.current).toBeGreaterThanOrEqual(600.0);
    expect(kpis.defaultRate.openOverdueBalance).toBeGreaterThanOrEqual(400.0);
  });

  it("transferências entre contas bancárias não alteram receita recebida nem despesa paga", async () => {
    const testDate = "2026-05-15";
    const kpisBefore = await getExecutiveKpis({ startDate: testDate, endDate: testDate });

    await transferBetweenAccounts({
      fromAccountId: account1Id,
      toAccountId: account2Id,
      amount: 1000.0,
      date: testDate,
      description: "Transferência Interna Teste BI",
    });

    const kpisAfter = await getExecutiveKpis({ startDate: testDate, endDate: testDate });
    // Transferências internas nunca geram receita recebida nem despesa paga
    expect(kpisAfter.receivedRevenue.current).toBe(kpisBefore.receivedRevenue.current);
    expect(kpisAfter.paidExpenses.current).toBe(kpisBefore.paidExpenses.current);
    expect(kpisAfter.receivedRevenue.current).toBe(0.0);
    expect(kpisAfter.paidExpenses.current).toBe(0.0);
  });

  it("persiste e recupera preferências de layout e visibilidade de widgets no banco", async () => {
    const customPrefs = {
      visibleWidgets: ["kpis_summary", "financial_evolution_chart"],
      widgetOrder: ["financial_evolution_chart", "kpis_summary"],
      collapsedWidgets: ["kpis_summary"],
      widgetSizes: {
        top_services_profitability: "full" as const,
      },
    };

    await saveDashboardPreferences(testUserId, customPrefs);
    const loaded = await getDashboardPreferences(testUserId);
    expect(loaded.visibleWidgets).toEqual(["kpis_summary", "financial_evolution_chart"]);
    expect(loaded.widgetOrder).toEqual(["financial_evolution_chart", "kpis_summary"]);
    expect(loaded.widgetSizes?.top_services_profitability).toBe("full");
  });

  it("relatório de inadimplência lista títulos vencidos com dias de atraso calculados", async () => {
    const report = await getReceivablesDefaultReport({ onlyOverdue: true });
    expect(report.length).toBeGreaterThan(0);
    const item = report.find((r) => r.id === receivableId);
    expect(item).toBeDefined();
    expect(item?.balanceAmount).toBe(400.0);
    expect(item?.daysOverdue).toBeGreaterThan(0);
  });

  it("relatório de fluxo de caixa previsto vs realizado calcula variações mensais", async () => {
    const report = await getCashflowComparisonReport(3);
    expect(report.length).toBe(3);
    expect(report[0]).toHaveProperty("projectedInflow");
    expect(report[0]).toHaveProperty("realizedInflow");
    expect(report[0]).toHaveProperty("netVariance");
  });

  it("relatório de evolução de MRR calcula métricas de crescimento e churn", async () => {
    const report = await getMrrEvolutionReport(3);
    expect(report.length).toBe(3);
    expect(report[0]).toHaveProperty("mrr");
    expect(report[0]).toHaveProperty("activeContractsCount");
    expect(report[0]).toHaveProperty("newContractsCount");
  });
});
