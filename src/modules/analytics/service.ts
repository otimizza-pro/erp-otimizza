import { query } from "@/lib/db/pool";
import {
  AnalyticsFilterParams,
  ExecutiveKpiSummary,
  MetricComparison,
  MonthlyEvolutionItem,
  ServiceProfitabilityReportItem,
  ComboProfitabilityReportItem,
  ClientProfitabilityReportItem,
  ReceivablesDefaultReportItem,
  DashboardLayoutPreferences,
} from "./types";

function calculateDeltaAndPct(current: number, previous: number): MetricComparison {
  const cur = Number(current.toFixed(2));
  const prev = Number(previous.toFixed(2));
  const delta = Number((cur - prev).toFixed(2));
  let percentageChange: number | null = null;
  if (prev !== 0) {
    percentageChange = Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
  } else if (cur > 0) {
    percentageChange = 100.0;
  }
  return {
    current: cur,
    previous: prev,
    delta,
    percentageChange,
  };
}

export function computeNormalizedMrr(billingPeriod: string, totalAmount: number): number {
  if (billingPeriod === "MONTHLY") {
    return Number(totalAmount.toFixed(2));
  }
  if (billingPeriod === "YEARLY") {
    return Number((totalAmount / 12).toFixed(2));
  }
  // ONE_TIME contratos avulsos não compõem MRR
  return 0;
}

// =========================================================================
// 1. SERVIÇO DE PREFERÊNCIAS DO ADMINISTRADOR
// =========================================================================

export async function getDashboardPreferences(
  userId: string,
  dashboardKey = "EXECUTIVE_OVERVIEW"
): Promise<DashboardLayoutPreferences> {
  const sql = `SELECT preferences FROM dashboard_preferences WHERE user_id = $1 AND dashboard_key = $2`;
  const res = await query(sql, [userId, dashboardKey]);
  if (res.rowCount && res.rowCount > 0) {
    return res.rows[0].preferences as DashboardLayoutPreferences;
  }
  // Padrão completo de widgets
  return {
    visibleWidgets: [
      "kpis_summary",
      "financial_evolution_chart",
      "mrr_evolution_card",
      "revenue_composition",
      "default_inadimplencia_card",
      "top_services_profitability",
      "top_clients_ranking",
    ],
    widgetOrder: [
      "kpis_summary",
      "financial_evolution_chart",
      "mrr_evolution_card",
      "default_inadimplencia_card",
      "revenue_composition",
      "top_services_profitability",
      "top_clients_ranking",
    ],
    collapsedWidgets: [],
  };
}

export async function saveDashboardPreferences(
  userId: string,
  preferences: DashboardLayoutPreferences,
  dashboardKey = "EXECUTIVE_OVERVIEW"
): Promise<void> {
  const sql = `
    INSERT INTO dashboard_preferences (user_id, dashboard_key, preferences, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, dashboard_key)
    DO UPDATE SET preferences = $3, updated_at = NOW()
  `;
  await query(sql, [userId, dashboardKey, JSON.stringify(preferences)]);
}

// =========================================================================
// 2. DASHBOARD EXECUTIVO E INDICADORES DE GESTÃO (KPIS)
// =========================================================================

export async function getExecutiveKpis(filters: AnalyticsFilterParams = {}): Promise<ExecutiveKpiSummary> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const start = filters.startDate || `${todayStr.slice(0, 7)}-01`;
  const end = filters.endDate || todayStr;

  // 1. Receita Efetivamente Recebida (Baixas do tipo RECEIPT válidas no período, abatendo estornos)
  const receiptsSql = `
    SELECT 
      COALESCE(SUM(CASE WHEN settlement_type = 'RECEIPT' AND is_reversed = FALSE THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN settlement_type = 'REVERSAL' AND receivable_id IS NOT NULL THEN amount ELSE 0 END), 0) as total_received
    FROM financial_settlements
    WHERE settlement_date >= $1 AND settlement_date <= $2
  `;
  const receiptsRes = await query<{ total_received: string }>(receiptsSql, [start, end]);
  const currentReceived = Number(receiptsRes.rows[0]?.total_received || 0);

  // Período anterior para comparação
  const daysDiff = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 3600 * 24)));
  const prevEnd = new Date(new Date(start).getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const prevStart = new Date(new Date(prevEnd).getTime() - daysDiff * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const prevReceiptsRes = await query<{ total_received: string }>(receiptsSql, [prevStart, prevEnd]);
  const prevReceived = Number(prevReceiptsRes.rows[0]?.total_received || 0);

  // 2. Despesas Pagas (Baixas PAYMENT válidas no período, abatendo estornos)
  const expensesSql = `
    SELECT 
      COALESCE(SUM(CASE WHEN settlement_type = 'PAYMENT' AND is_reversed = FALSE THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN settlement_type = 'REVERSAL' AND payable_id IS NOT NULL THEN amount ELSE 0 END), 0) as total_paid
    FROM financial_settlements
    WHERE settlement_date >= $1 AND settlement_date <= $2
  `;
  const expensesRes = await query<{ total_paid: string }>(expensesSql, [start, end]);
  const currentPaid = Number(expensesRes.rows[0]?.total_paid || 0);

  const prevExpensesRes = await query<{ total_paid: string }>(expensesSql, [prevStart, prevEnd]);
  const prevPaid = Number(prevExpensesRes.rows[0]?.total_paid || 0);

  // 3. Resultado Realizado (Recebimentos - Pagamentos)
  const receivedComp = calculateDeltaAndPct(currentReceived, prevReceived);
  const paidComp = calculateDeltaAndPct(currentPaid, prevPaid);
  const realizedComp = calculateDeltaAndPct(currentReceived - currentPaid, prevReceived - prevPaid);

  // 4. Receita Prevista por Vencimento e por Competência
  const projDueSql = `
    SELECT COALESCE(SUM(balance_amount), 0) as total_proj
    FROM receivables
    WHERE due_date >= $1 AND due_date <= $2 AND status <> 'CANCELED'
  `;
  const projDueRes = await query<{ total_proj: string }>(projDueSql, [start, end]);
  const projectedRevenueDue = Number(Number(projDueRes.rows[0]?.total_proj || 0).toFixed(2));

  const startMonth = start.slice(0, 7);
  const endMonth = end.slice(0, 7);
  const projCompSql = `
    SELECT COALESCE(SUM(original_amount), 0) as total_comp
    FROM receivables
    WHERE competency >= $1 AND competency <= $2 AND status <> 'CANCELED'
  `;
  const projCompRes = await query<{ total_comp: string }>(projCompSql, [startMonth, endMonth]);
  const projectedRevenueCompetency = Number(Number(projCompRes.rows[0]?.total_comp || 0).toFixed(2));

  // 5. Despesas Previstas por Vencimento
  const projExpSql = `
    SELECT COALESCE(SUM(balance_amount), 0) as total_proj_exp
    FROM payables
    WHERE due_date >= $1 AND due_date <= $2 AND status <> 'CANCELED'
  `;
  const projExpRes = await query<{ total_proj_exp: string }>(projExpSql, [start, end]);
  const projectedExpenses = Number(Number(projExpRes.rows[0]?.total_proj_exp || 0).toFixed(2));

  const projectedResult = Number((projectedRevenueDue - projectedExpenses).toFixed(2));

  // 6. Inadimplência (Títulos com vencimento < hoje e saldo restante > 0)
  const defaultSql = `
    SELECT 
      COALESCE(SUM(original_amount), 0) as overdue_amount,
      COALESCE(SUM(balance_amount), 0) as open_overdue_balance,
      COUNT(id) as overdue_count
    FROM receivables
    WHERE due_date < $1 AND balance_amount > 0 AND status <> 'CANCELED'
  `;
  const defaultRes = await query<{
    overdue_amount: string;
    open_overdue_balance: string;
    overdue_count: string;
  }>(defaultSql, [todayStr]);

  // 7. MRR (Receita Mensal Recorrente) calculada sobre a versão ativa de contratos vigentes
  const mrrSql = `
    WITH active_versions AS (
      SELECT DISTINCT ON (c.id) 
        c.id as contract_id,
        cv.billing_period,
        cv.total_amount
      FROM contracts c
      JOIN contract_versions cv ON cv.contract_id = c.id
      WHERE c.status = 'ACTIVE'
        AND cv.effective_date <= $1
      ORDER BY c.id, cv.version_number DESC
    )
    SELECT 
      billing_period,
      total_amount
    FROM active_versions
  `;
  const mrrRes = await query<{ billing_period: string; total_amount: string }>(mrrSql, [todayStr]);
  let currentMrr = 0;
  let monthlyCount = 0;
  let yearlyCount = 0;

  for (const row of mrrRes.rows) {
    const amt = Number(row.total_amount);
    if (row.billing_period === "MONTHLY") {
      currentMrr += amt;
      monthlyCount++;
    } else if (row.billing_period === "YEARLY") {
      currentMrr += amt / 12;
      yearlyCount++;
    }
  }

  // 8. Quantidades Ativas
  const clientsCountRes = await query<{ total: string }>("SELECT COUNT(id) as total FROM clients WHERE status = 'ACTIVE'");
  const contractsCountRes = await query<{ total: string }>("SELECT COUNT(id) as total FROM contracts WHERE status = 'ACTIVE'");

  return {
    receivedRevenue: receivedComp,
    projectedRevenueDue,
    projectedRevenueCompetency,
    paidExpenses: paidComp,
    projectedExpenses,
    realizedResult: realizedComp,
    projectedResult,
    defaultRate: {
      overdueAmount: Number(Number(defaultRes.rows[0]?.overdue_amount || 0).toFixed(2)),
      openOverdueBalance: Number(Number(defaultRes.rows[0]?.open_overdue_balance || 0).toFixed(2)),
      overdueTitlesCount: parseInt(defaultRes.rows[0]?.overdue_count || "0", 10),
    },
    mrr: {
      currentMrr: Number(currentMrr.toFixed(2)),
      monthlyContractsCount: monthlyCount,
      yearlyContractsNormalizedCount: yearlyCount,
    },
    activeClientsCount: parseInt(clientsCountRes.rows[0]?.total || "0", 10),
    activeContractsCount: parseInt(contractsCountRes.rows[0]?.total || "0", 10),
  };
}

// =========================================================================
// 3. EVOLUÇÃO TEMPORAL MENSAL (GRÁFICOS DE SÉRIES TEMPORAIS)
// =========================================================================

export async function getMonthlyEvolution(monthsCount = 6): Promise<MonthlyEvolutionItem[]> {
  const result: MonthlyEvolutionItem[] = [];
  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const startOfMonth = `${monthStr}-01`;
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Recebido
    const recRes = await query<{ val: string }>(
      `SELECT 
        COALESCE(SUM(CASE WHEN settlement_type = 'RECEIPT' AND is_reversed = FALSE THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN settlement_type = 'REVERSAL' AND receivable_id IS NOT NULL THEN amount ELSE 0 END), 0) as val
       FROM financial_settlements
       WHERE settlement_date >= $1 AND settlement_date <= $2`,
      [startOfMonth, lastDayOfMonth]
    );

    // Pago
    const pagRes = await query<{ val: string }>(
      `SELECT 
        COALESCE(SUM(CASE WHEN settlement_type = 'PAYMENT' AND is_reversed = FALSE THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN settlement_type = 'REVERSAL' AND payable_id IS NOT NULL THEN amount ELSE 0 END), 0) as val
       FROM financial_settlements
       WHERE settlement_date >= $1 AND settlement_date <= $2`,
      [startOfMonth, lastDayOfMonth]
    );

    // Previsto Receita
    const projRecRes = await query<{ val: string }>(
      `SELECT COALESCE(SUM(balance_amount), 0) as val
       FROM receivables
       WHERE due_date >= $1 AND due_date <= $2 AND status <> 'CANCELED'`,
      [startOfMonth, lastDayOfMonth]
    );

    // Previsto Despesa
    const projPagRes = await query<{ val: string }>(
      `SELECT COALESCE(SUM(balance_amount), 0) as val
       FROM payables
       WHERE due_date >= $1 AND due_date <= $2 AND status <> 'CANCELED'`,
      [startOfMonth, lastDayOfMonth]
    );

    const rec = Number(recRes.rows[0]?.val || 0);
    const pag = Number(pagRes.rows[0]?.val || 0);
    const projRec = Number(projRecRes.rows[0]?.val || 0);
    const projPag = Number(projPagRes.rows[0]?.val || 0);

    // MRR no encerramento do mês
    const mrrRes = await query<{ billing_period: string; total_amount: string }>(
      `WITH active_versions AS (
        SELECT DISTINCT ON (c.id) 
          c.id, cv.billing_period, cv.total_amount
        FROM contracts c
        JOIN contract_versions cv ON cv.contract_id = c.id
        WHERE c.status = 'ACTIVE' AND cv.effective_date <= $1
        ORDER BY c.id, cv.version_number DESC
      )
      SELECT billing_period, total_amount FROM active_versions`,
      [lastDayOfMonth]
    );

    let monthMrr = 0;
    for (const r of mrrRes.rows) {
      monthMrr += computeNormalizedMrr(r.billing_period, Number(r.total_amount));
    }

    result.push({
      month: monthStr,
      receivedRevenue: Number(rec.toFixed(2)),
      projectedRevenue: Number(projRec.toFixed(2)),
      paidExpenses: Number(pag.toFixed(2)),
      projectedExpenses: Number(projPag.toFixed(2)),
      realizedResult: Number((rec - pag).toFixed(2)),
      mrr: Number(monthMrr.toFixed(2)),
    });
  }

  return result;
}

// =========================================================================
// 4. RELATÓRIOS ANALÍTICOS ESPECÍFICOS
// =========================================================================

// 4.1 Rentabilidade por Serviço
export async function getServiceProfitabilityReport(filters: AnalyticsFilterParams = {}): Promise<ServiceProfitabilityReportItem[]> {
  const sql = `
    WITH service_revenue AS (
      SELECT 
        ci.service_id,
        ci.service_name,
        SUM(ci.subtotal) as contracted_revenue,
        SUM(ci.unit_cost * ci.quantity) as estimated_cost,
        COUNT(DISTINCT c.id) as active_contracts
      FROM contract_items ci
      JOIN contract_versions cv ON cv.id = ci.contract_version_id
      JOIN contracts c ON c.id = cv.contract_id
      WHERE c.status = 'ACTIVE'
      GROUP BY ci.service_id, ci.service_name
    ),
    service_realized_costs AS (
      SELECT 
        p.service_id,
        COALESCE(SUM(fs.amount), 0) as realized_expense
      FROM payables p
      JOIN financial_settlements fs ON fs.payable_id = p.id
      WHERE fs.settlement_type = 'PAYMENT' AND fs.is_reversed = FALSE
        AND p.service_id IS NOT NULL
      GROUP BY p.service_id
    )
    SELECT 
      sr.service_id,
      sr.service_name,
      s.category_id,
      fc.name as category_name,
      COALESCE(sr.contracted_revenue, 0) as contracted_revenue,
      COALESCE(sr.estimated_cost, 0) as estimated_cost,
      COALESCE(sc.realized_expense, 0) as realized_expense,
      COALESCE(sr.active_contracts, 0) as active_contracts
    FROM service_revenue sr
    LEFT JOIN services s ON s.id = sr.service_id
    LEFT JOIN financial_categories fc ON fc.id = s.category_id
    LEFT JOIN service_realized_costs sc ON sc.service_id = sr.service_id
    ORDER BY sr.contracted_revenue DESC
  `;

  const res = await query(sql);
  return res.rows.map((r) => {
    const rev = Number(r.contracted_revenue);
    const cost = Number(r.estimated_cost);
    const realExp = Number(r.realized_expense);
    const estMargin = rev - cost;
    const estPct = rev > 0 ? (estMargin / rev) * 100 : 0;
    const realMargin = rev - realExp;
    const realPct = rev > 0 ? (realMargin / rev) * 100 : 0;

    return {
      serviceId: r.service_id,
      serviceName: r.service_name,
      categoryName: r.category_name || "Geral",
      contractedRevenue: Number(rev.toFixed(2)),
      estimatedCost: Number(cost.toFixed(2)),
      realizedExpenseAllocated: Number(realExp.toFixed(2)),
      estimatedGrossMargin: Number(estMargin.toFixed(2)),
      estimatedGrossMarginPercent: Number(estPct.toFixed(1)),
      realizedGrossMargin: Number(realMargin.toFixed(2)),
      realizedGrossMarginPercent: Number(realPct.toFixed(1)),
      activeContractsCount: parseInt(r.active_contracts || "0", 10),
    };
  });
}

// 4.2 Rentabilidade por Combo
export async function getComboProfitabilityReport(): Promise<ComboProfitabilityReportItem[]> {
  const sql = `
    SELECT 
      ci.combo_id,
      ci.combo_name,
      SUM(ci.subtotal) as contracted_revenue,
      SUM(ci.unit_cost * ci.quantity) as estimated_cost,
      COUNT(DISTINCT c.id) as active_contracts
    FROM contract_items ci
    JOIN contract_versions cv ON cv.id = ci.contract_version_id
    JOIN contracts c ON c.id = cv.contract_id
    WHERE c.status = 'ACTIVE' AND ci.combo_id IS NOT NULL
    GROUP BY ci.combo_id, ci.combo_name
    ORDER BY contracted_revenue DESC
  `;
  const res = await query(sql);
  return res.rows.map((r) => {
    const rev = Number(r.contracted_revenue);
    const cost = Number(r.estimated_cost);
    const margin = rev - cost;
    const pct = rev > 0 ? (margin / rev) * 100 : 0;
    return {
      comboId: r.combo_id,
      comboName: r.combo_name || "Combo Sem Nome",
      contractedRevenue: Number(rev.toFixed(2)),
      estimatedCost: Number(cost.toFixed(2)),
      estimatedGrossMargin: Number(margin.toFixed(2)),
      estimatedGrossMarginPercent: Number(pct.toFixed(1)),
      activeContractsCount: parseInt(r.active_contracts || "0", 10),
    };
  });
}

// 4.3 Rentabilidade e Faturamento por Cliente
export async function getClientProfitabilityReport(): Promise<ClientProfitabilityReportItem[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const sql = `
    WITH client_contracts AS (
      SELECT 
        c.client_id,
        COUNT(DISTINCT c.id) as active_contracts,
        SUM(cv.total_amount) as total_contracted
      FROM contracts c
      JOIN contract_versions cv ON cv.contract_id = c.id
      WHERE c.status = 'ACTIVE'
      GROUP BY c.client_id
    ),
    client_receivables AS (
      SELECT 
        r.client_id,
        COALESCE(SUM(r.paid_amount), 0) as total_received,
        COALESCE(SUM(r.balance_amount), 0) as open_balance,
        COALESCE(SUM(CASE WHEN r.due_date < $1 THEN r.balance_amount ELSE 0 END), 0) as overdue_balance
      FROM receivables r
      WHERE r.status <> 'CANCELED'
      GROUP BY r.client_id
    )
    SELECT 
      cl.id as client_id,
      cl.name as client_name,
      cl.document as client_document,
      COALESCE(cc.total_contracted, 0) as total_contracted,
      COALESCE(cr.total_received, 0) as total_received,
      COALESCE(cr.open_balance, 0) as open_balance,
      COALESCE(cr.overdue_balance, 0) as overdue_balance,
      COALESCE(cc.active_contracts, 0) as active_contracts
    FROM clients cl
    LEFT JOIN client_contracts cc ON cc.client_id = cl.id
    LEFT JOIN client_receivables cr ON cr.client_id = cl.id
    WHERE cl.status = 'ACTIVE'
    ORDER BY total_received DESC, open_balance DESC
  `;
  const res = await query(sql, [todayStr]);
  return res.rows.map((r) => ({
    clientId: r.client_id,
    clientName: r.client_name,
    clientDocument: r.client_document,
    totalContractedAmount: Number(Number(r.total_contracted).toFixed(2)),
    totalReceivedAmount: Number(Number(r.total_received).toFixed(2)),
    openBalanceAmount: Number(Number(r.open_balance).toFixed(2)),
    overdueAmount: Number(Number(r.overdue_balance).toFixed(2)),
    activeContractsCount: parseInt(r.active_contracts || "0", 10),
  }));
}

// 4.4 Relatório de Contas a Receber e Inadimplência Detalhada
export async function getReceivablesDefaultReport(filters: {
  onlyOverdue?: boolean;
  clientId?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<ReceivablesDefaultReportItem[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const conditions: string[] = ["r.status <> 'CANCELED'"];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.onlyOverdue) {
    conditions.push(`r.due_date < $${idx++} AND r.balance_amount > 0`);
    params.push(todayStr);
  }
  if (filters.clientId) {
    conditions.push(`r.client_id = $${idx++}`);
    params.push(filters.clientId);
  }
  if (filters.startDate) {
    conditions.push(`r.due_date >= $${idx++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`r.due_date <= $${idx++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT 
      r.id,
      r.receivable_number,
      c.name as client_name,
      ct.contract_number,
      r.competency,
      r.due_date,
      r.original_amount,
      r.paid_amount,
      r.balance_amount,
      r.status,
      GREATEST(0, (CURRENT_DATE - r.due_date)) as days_overdue
    FROM receivables r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN contracts ct ON ct.id = r.contract_id
    ${whereClause}
    ORDER BY r.due_date ASC, r.balance_amount DESC
  `;

  const res = await query(sql, params);
  return res.rows.map((r) => ({
    id: r.id,
    receivableNumber: r.receivable_number,
    clientName: r.client_name,
    contractNumber: r.contract_number,
    competency: r.competency,
    dueDate: typeof r.due_date === "string" ? r.due_date.slice(0, 10) : r.due_date.toISOString().slice(0, 10),
    originalAmount: Number(r.original_amount),
    paidAmount: Number(r.paid_amount),
    balanceAmount: Number(r.balance_amount),
    status: r.status,
    daysOverdue: parseInt(r.days_overdue || "0", 10),
  }));
}
