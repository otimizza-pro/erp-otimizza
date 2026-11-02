import { query } from "../src/lib/db/pool";
import {
  getExecutiveKpis,
  getMonthlyEvolution,
  getServiceProfitabilityReport,
  getClientProfitabilityReport,
  getReceivablesDefaultReport,
  getPayablesReport,
  getCashflowComparisonReport,
  getMrrEvolutionReport,
} from "../src/modules/analytics/service";
import { CrmService } from "../src/modules/crm/service";
import { ProposalService } from "../src/modules/proposals/service";

export interface KpiComparisonRow {
  indicator: string;
  periodOrFilter: string;
  expectedControlValue: number | string;
  appReportedValue: number | string;
  difference: number | string;
  status: "OK" | "DIVERGENTE";
  notes?: string;
}

export async function runKpiAudit(): Promise<KpiComparisonRow[]> {
  const comparisonRows: KpiComparisonRow[] = [];
  const cutoffDate = "2026-11-02";
  const startOfYear = "2026-01-01";

  console.log("\n================================================================================");
  console.log("🔍 INICIANDO AUDITORIA INDEPENDENTE DE KPIS E BI (DUPLA VIA DE CONFERÊNCIA)");
  console.log("================================================================================");
  console.log(`• Data de Corte Fixada: ${cutoffDate}`);
  console.log(`• Período Analisado: ${startOfYear} a ${cutoffDate}`);
  console.log("--------------------------------------------------------------------------------\n");

  // =========================================================================
  // VIA A: Módulos e Funções da Aplicação
  // =========================================================================
  const appKpis = await getExecutiveKpis({
    startDate: startOfYear,
    endDate: cutoffDate,
  });

  const crmKpis = await CrmService.getCrmKpis();
  const proposalKpis = await ProposalService.getProposalMetrics();

  // =========================================================================
  // VIA B: Consultas de Controle Independentes (Raw SQL direto nas tabelas)
  // =========================================================================

  // 1. Receita Efetivamente Recebida (Regime de Caixa)
  // Definição: Soma de baixas confirmadas (RECEIPT) não estornadas entre 01/01/2026 e 02/11/2026
  const ctrlReceiptsRes = await query<{ total: string }>(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM financial_settlements
    WHERE settlement_type = 'RECEIPT'
      AND is_reversed = FALSE
      AND settlement_date >= $1 AND settlement_date <= $2
  `, [startOfYear, cutoffDate]);
  const ctrlReceived = Number(Number(ctrlReceiptsRes.rows[0].total).toFixed(2));
  const appReceived = appKpis.receivedRevenue.current;

  comparisonRows.push({
    indicator: "Receita Efetivamente Recebida",
    periodOrFilter: `${startOfYear} a ${cutoffDate} (Regime Caixa)`,
    expectedControlValue: ctrlReceived,
    appReportedValue: appReceived,
    difference: Number((appReceived - ctrlReceived).toFixed(2)),
    status: Math.abs(appReceived - ctrlReceived) < 0.01 ? "OK" : "DIVERGENTE",
    notes: "Baixas válidas em conta bancária (sem dupla dedução de estorno)",
  });

  // 2. Despesas Pagas (Regime de Caixa)
  // Definição: Soma de liquidações (PAYMENT) não estornadas entre 01/01/2026 e 02/11/2026
  const ctrlExpensesRes = await query<{ total: string }>(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM financial_settlements
    WHERE settlement_type = 'PAYMENT'
      AND is_reversed = FALSE
      AND settlement_date >= $1 AND settlement_date <= $2
  `, [startOfYear, cutoffDate]);
  const ctrlPaid = Number(Number(ctrlExpensesRes.rows[0].total).toFixed(2));
  const appPaid = appKpis.paidExpenses.current;

  comparisonRows.push({
    indicator: "Despesas Operacionais Pagas",
    periodOrFilter: `${startOfYear} a ${cutoffDate} (Regime Caixa)`,
    expectedControlValue: ctrlPaid,
    appReportedValue: appPaid,
    difference: Number((appPaid - ctrlPaid).toFixed(2)),
    status: Math.abs(appPaid - ctrlPaid) < 0.01 ? "OK" : "DIVERGENTE",
    notes: "Saídas de caixa confirmadas no extrato bancário",
  });

  // 3. Resultado Financeiro Realizado
  // Definição: Recebimentos - Pagamentos
  const ctrlResult = Number((ctrlReceived - ctrlPaid).toFixed(2));
  const appResult = appKpis.realizedResult.current;

  comparisonRows.push({
    indicator: "Resultado Líquido Realizado (Caixa)",
    periodOrFilter: `${startOfYear} a ${cutoffDate}`,
    expectedControlValue: ctrlResult,
    appReportedValue: appResult,
    difference: Number((appResult - ctrlResult).toFixed(2)),
    status: Math.abs(appResult - ctrlResult) < 0.01 ? "OK" : "DIVERGENTE",
    notes: "Saldo líquido apurado por movimentações efetivas",
  });

  // 4. Receita Prevista por Vencimento
  // Definição: Saldo devedor em aberto (balance_amount) de títulos não cancelados com vencimento no período
  const ctrlProjDueRes = await query<{ total: string }>(`
    SELECT COALESCE(SUM(balance_amount), 0) as total
    FROM receivables
    WHERE due_date >= $1 AND due_date <= $2 AND status <> 'CANCELED'
  `, [startOfYear, cutoffDate]);
  const ctrlProjDue = Number(Number(ctrlProjDueRes.rows[0].total).toFixed(2));
  const appProjDue = appKpis.projectedRevenueDue;

  comparisonRows.push({
    indicator: "Receita Prevista em Aberto (Vencimento)",
    periodOrFilter: `Vencimento ${startOfYear} a ${cutoffDate}`,
    expectedControlValue: ctrlProjDue,
    appReportedValue: appProjDue,
    difference: Number((appProjDue - ctrlProjDue).toFixed(2)),
    status: Math.abs(appProjDue - ctrlProjDue) < 0.01 ? "OK" : "DIVERGENTE",
    notes: "Saldo remanescente de títulos a receber (respeita baixas parciais)",
  });

  // 5. Inadimplência: Saldo em Atraso (Overdue)
  // Definição: Títulos a receber com due_date < cutoffDate e balance_amount > 0 não cancelados
  const ctrlOverdueRes = await query<{ total_balance: string; count: string }>(`
    SELECT 
      COALESCE(SUM(balance_amount), 0) as total_balance,
      COUNT(id) as count
    FROM receivables
    WHERE due_date < $1 AND balance_amount > 0 AND status <> 'CANCELED'
  `, [cutoffDate]);
  const ctrlOverdueBal = Number(Number(ctrlOverdueRes.rows[0].total_balance).toFixed(2));
  const appOverdueBal = appKpis.defaultRate.openOverdueBalance;

  comparisonRows.push({
    indicator: "Saldo Inadimplente em Aberto",
    periodOrFilter: `Vencimento anterior a ${cutoffDate}`,
    expectedControlValue: ctrlOverdueBal,
    appReportedValue: appOverdueBal,
    difference: Number((appOverdueBal - ctrlOverdueBal).toFixed(2)),
    status: Math.abs(appOverdueBal - ctrlOverdueBal) < 0.01 ? "OK" : "DIVERGENTE",
    notes: "Não considera valor integral de cobrança parcialmente paga",
  });

  // 6. MRR (Receita Recorrente Mensal Normalizada)
  // Definição: Contratos ACTIVE com effective_date <= cutoffDate.
  // MONTHLY soma 100%, YEARLY divide por 12, ONE_TIME excluído. Versão mais recente.
  const ctrlMrrRes = await query<{ billing_period: string; total_amount: string }>(`
    WITH active_versions AS (
      SELECT DISTINCT ON (c.id) 
        c.id, cv.billing_period, cv.total_amount
      FROM contracts c
      JOIN contract_versions cv ON cv.contract_id = c.id
      WHERE c.status = 'ACTIVE' AND cv.effective_date <= $1
      ORDER BY c.id, cv.version_number DESC
    )
    SELECT billing_period, total_amount FROM active_versions
  `, [cutoffDate]);

  let ctrlMrr = 0;
  for (const r of ctrlMrrRes.rows) {
    const amt = Number(r.total_amount);
    if (r.billing_period === "MONTHLY") ctrlMrr += amt;
    else if (r.billing_period === "YEARLY") ctrlMrr += amt / 12;
  }
  ctrlMrr = Number(ctrlMrr.toFixed(2));
  const appMrr = appKpis.mrr.currentMrr;

  comparisonRows.push({
    indicator: "MRR Normalizado",
    periodOrFilter: `Posição em ${cutoffDate}`,
    expectedControlValue: ctrlMrr,
    appReportedValue: appMrr,
    difference: Number((appMrr - ctrlMrr).toFixed(2)),
    status: Math.abs(appMrr - ctrlMrr) < 0.01 ? "OK" : "DIVERGENTE",
    notes: "Avulsos excluídos; Anuais divididos por 12; Apenas versão vigente",
  });

  // 7. Clientes Ativos
  const ctrlClientsRes = await query<{ count: string }>(`
    SELECT COUNT(id) as count FROM clients WHERE status = 'ACTIVE'
  `);
  const ctrlClientsCount = parseInt(ctrlClientsRes.rows[0].count, 10);
  const appClientsCount = appKpis.activeClientsCount;

  comparisonRows.push({
    indicator: "Total de Clientes Ativos",
    periodOrFilter: "Status = ACTIVE",
    expectedControlValue: ctrlClientsCount,
    appReportedValue: appClientsCount,
    difference: appClientsCount - ctrlClientsCount,
    status: appClientsCount === ctrlClientsCount ? "OK" : "DIVERGENTE",
  });

  // 8. Contratos Ativos
  const ctrlContractsRes = await query<{ count: string }>(`
    SELECT COUNT(id) as count FROM contracts WHERE status = 'ACTIVE'
  `);
  const ctrlContractsCount = parseInt(ctrlContractsRes.rows[0].count, 10);
  const appContractsCount = appKpis.activeContractsCount;

  comparisonRows.push({
    indicator: "Total de Contratações Ativas",
    periodOrFilter: "Status = ACTIVE",
    expectedControlValue: ctrlContractsCount,
    appReportedValue: appContractsCount,
    difference: appContractsCount - ctrlContractsCount,
    status: appContractsCount === ctrlContractsCount ? "OK" : "DIVERGENTE",
  });

  // 9. Pipeline Comercial: Valor Total em Aberto
  const ctrlPipelineRes = await query<{ total: string; weighted: string; open_count: string }>(`
    SELECT 
      COALESCE(SUM(amount), 0) as total,
      COALESCE(SUM(amount * probability / 100.0), 0) as weighted,
      COUNT(id) as open_count
    FROM crm_opportunities
    WHERE status = 'OPEN'
  `);
  const ctrlPipeTotal = Number(Number(ctrlPipelineRes.rows[0].total).toFixed(2));
  const ctrlPipeWeighted = Number(Number(ctrlPipelineRes.rows[0].weighted).toFixed(2));
  const appPipeTotal = crmKpis.totalPipelineAmount;
  const appPipeWeighted = crmKpis.weightedPipelineAmount;

  comparisonRows.push({
    indicator: "Valor Total do Pipeline Comercial (Aberto)",
    periodOrFilter: "Status = OPEN",
    expectedControlValue: ctrlPipeTotal,
    appReportedValue: appPipeTotal,
    difference: Number((appPipeTotal - ctrlPipeTotal).toFixed(2)),
    status: Math.abs(appPipeTotal - ctrlPipeTotal) < 0.01 ? "OK" : "DIVERGENTE",
  });

  comparisonRows.push({
    indicator: "Valor Ponderado do Pipeline (Probability)",
    periodOrFilter: "Status = OPEN (Probabilidade ponderada)",
    expectedControlValue: ctrlPipeWeighted,
    appReportedValue: appPipeWeighted,
    difference: Number((appPipeWeighted - ctrlPipeWeighted).toFixed(2)),
    status: Math.abs(appPipeWeighted - ctrlPipeWeighted) < 0.01 ? "OK" : "DIVERGENTE",
  });

  // 10. Propostas Comerciais: Total Aprovado (Sem duplicar versões)
  const ctrlPropApprovedRes = await query<{ count: string; monthly: string }>(`
    SELECT 
      COUNT(DISTINCT p.id) as count,
      COALESCE(SUM(v.total_monthly_effective), 0) as monthly
    FROM proposals p
    JOIN proposal_versions v ON v.proposal_id = p.id AND v.version_number = p.current_version_number
    WHERE p.status = 'APPROVED' AND p.archived_at IS NULL
  `);
  const ctrlPropCount = parseInt(ctrlPropApprovedRes.rows[0].count, 10);
  const appPropCount = proposalKpis.approvedCount;

  comparisonRows.push({
    indicator: "Propostas Aprovadas (Sem duplicidade de versões)",
    periodOrFilter: "Status = APPROVED (current_version_number)",
    expectedControlValue: ctrlPropCount,
    appReportedValue: appPropCount,
    difference: appPropCount - ctrlPropCount,
    status: appPropCount === ctrlPropCount ? "OK" : "DIVERGENTE",
    notes: "Garante snapshot único da versão aprovada",
  });

  console.log("--------------------------------------------------------------------------------");
  console.log("TABELA DE CONFERÊNCIA DOS KPIS (RECONCILIAÇÃO DUPLA):");
  console.log("--------------------------------------------------------------------------------");
  console.log(
    `${"Indicador".padEnd(38)} | ${"Esperado (SQL)".padEnd(14)} | ${"Exibido (App)".padEnd(14)} | ${"Dif".padEnd(8)} | Status`
  );
  console.log("--------------------------------------------------------------------------------");

  for (const row of comparisonRows) {
    const indStr = row.indicator.padEnd(38).slice(0, 38);
    const expStr = String(row.expectedControlValue).padEnd(14);
    const appStr = String(row.appReportedValue).padEnd(14);
    const difStr = String(row.difference).padEnd(8);
    console.log(`${indStr} | ${expStr} | ${appStr} | ${difStr} | ${row.status}`);
  }
  console.log("--------------------------------------------------------------------------------\n");

  // Auditoria Detalhada dos Relatórios BI
  console.log("📊 AUDITORIA DOS RELATÓRIOS ANALÍTICOS E BI (DRILL-DOWN):");

  // 1. Rentabilidade por Serviço
  const serviceProf = await getServiceProfitabilityReport();
  console.log(`\n• Rentabilidade por Serviço (${serviceProf.length} serviços avaliados):`);
  for (const s of serviceProf.slice(0, 5)) {
    console.log(`  - ${s.serviceName}: Receita R$ ${s.contractedRevenue.toLocaleString("pt-BR")}, Custo R$ ${s.estimatedCost.toLocaleString("pt-BR")}, Margem ${s.estimatedGrossMarginPercent}% (${s.activeContractsCount} contratos)`);
  }

  // 2. Ranking de Clientes por Receita
  const clientProf = await getClientProfitabilityReport();
  console.log(`\n• Top Clientes por Rentabilidade (${clientProf.length} clientes auditados):`);
  for (const c of clientProf.slice(0, 5)) {
    console.log(`  - ${c.clientName}: Contratado R$ ${c.totalContractedAmount.toLocaleString("pt-BR")}, Recebido R$ ${c.totalReceivedAmount.toLocaleString("pt-BR")}, Saldo em Aberto R$ ${c.openBalanceAmount.toLocaleString("pt-BR")}`);
  }

  // 3. Evolução Mensal do Fluxo de Caixa (Realizado)
  const monthlyEvol = await getMonthlyEvolution(11);
  console.log(`\n• Evolução Financeira Mensal (Últimos ${monthlyEvol.length} meses):`);
  for (const m of monthlyEvol) {
    console.log(`  - Mês ${m.month}: Receita R$ ${m.receivedRevenue.toLocaleString("pt-BR")}, Despesa R$ ${m.paidExpenses.toLocaleString("pt-BR")}, Saldo Líquido R$ ${m.realizedResult.toLocaleString("pt-BR")}, MRR R$ ${m.mrr.toLocaleString("pt-BR")}`);
  }

  // 4. Comparativo Projetado vs Realizado (Cashflow Comparison)
  const cashflowComp = await getCashflowComparisonReport(11);
  console.log(`\n• Comparativo Projetado vs Realizado de Fluxo de Caixa:`);
  for (const cf of cashflowComp.slice(-3)) {
    console.log(`  - Mês ${cf.period}: Projetado R$ ${cf.projectedNet.toLocaleString("pt-BR")}, Realizado R$ ${cf.realizedNet.toLocaleString("pt-BR")}, Variação R$ ${cf.netVariance.toLocaleString("pt-BR")}`);
  }

  return comparisonRows;
}

if (process.argv[1] && process.argv[1].includes("audit-kpis.ts")) {
  runKpiAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Erro ao auditar KPIs:", err);
      process.exit(1);
    });
}