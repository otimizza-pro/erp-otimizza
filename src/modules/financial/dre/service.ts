import { query } from "@/lib/db/pool";
import {
  AccountingMethod,
  CostCenterRecord,
  CostCenterAllocationRecord,
  DREPeriodStatement,
  DREMultiPeriodResult,
  ManagerialAccountRecord,
  RevenueAccrualRecord,
  CostCenterInputSchema,
  PayableAllocationsInputSchema,
  DRELineItem,
} from "./types";

function toCents(value: number): number {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

// ----------------------------------------------------------------------
// 1. Centros de Custo (CRUD & Rateios)
// ----------------------------------------------------------------------

export async function getCostCenters(includeArchived = false): Promise<CostCenterRecord[]> {
  const sql = `
    SELECT 
      id, code, name, description, status,
      is_system_default as "isSystemDefault",
      archived_at as "archivedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM cost_centers
    WHERE ($1 = true OR status = 'ACTIVE')
    ORDER BY code ASC
  `;
  const result = await query<CostCenterRecord>(sql, [includeArchived]);
  return result.rows;
}

export async function createCostCenter(input: {
  code: string;
  name: string;
  description?: string | null;
}): Promise<CostCenterRecord> {
  const validated = CostCenterInputSchema.parse(input);

  const sql = `
    INSERT INTO cost_centers (code, name, description, status, is_system_default)
    VALUES ($1, $2, $3, 'ACTIVE', false)
    RETURNING 
      id, code, name, description, status,
      is_system_default as "isSystemDefault",
      archived_at as "archivedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;
  const result = await query<CostCenterRecord>(sql, [
    validated.code,
    validated.name,
    validated.description || null,
  ]);
  return result.rows[0];
}

export async function updateCostCenter(
  id: string,
  input: { name?: string; description?: string | null }
): Promise<CostCenterRecord> {
  const sql = `
    UPDATE cost_centers
    SET 
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING 
      id, code, name, description, status,
      is_system_default as "isSystemDefault",
      archived_at as "archivedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;
  const result = await query<CostCenterRecord>(sql, [id, input.name || null, input.description || null]);
  if (result.rows.length === 0) {
    throw new Error("Centro de custo não encontrado.");
  }
  return result.rows[0];
}

export async function archiveCostCenter(id: string): Promise<void> {
  const checkSql = `SELECT is_system_default as "isSystemDefault" FROM cost_centers WHERE id = $1`;
  const check = await query<{ isSystemDefault: boolean }>(checkSql, [id]);
  if (check.rows.length === 0) {
    throw new Error("Centro de custo não encontrado.");
  }
  if (check.rows[0].isSystemDefault) {
    throw new Error("Centros de custo padrão do sistema não podem ser arquivados.");
  }

  await query(
    `UPDATE cost_centers SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}

export async function getPayableAllocations(payableId: string): Promise<CostCenterAllocationRecord[]> {
  const sql = `
    SELECT 
      a.id,
      a.payable_id as "payableId",
      a.cost_center_id as "costCenterId",
      c.code as "costCenterCode",
      c.name as "costCenterName",
      a.percentage::float as percentage,
      a.amount::float as amount,
      a.status,
      a.notes,
      a.created_at as "createdAt",
      a.updated_at as "updatedAt"
    FROM financial_cost_center_allocations a
    JOIN cost_centers c ON c.id = a.cost_center_id
    WHERE a.payable_id = $1 AND a.status = 'ACTIVE'
    ORDER BY c.code ASC
  `;
  const result = await query<CostCenterAllocationRecord>(sql, [payableId]);
  return result.rows;
}

export async function allocatePayableCostCenters(input: {
  payableId: string;
  allocations: Array<{
    costCenterId: string;
    percentage: number;
    amount: number;
    notes?: string | null;
  }>;
}): Promise<void> {
  const validated = PayableAllocationsInputSchema.parse(input);

  // 1. Validar payable
  const payRes = await query<{ id: string; original_amount: string; status: string }>(
    `SELECT id, original_amount, status FROM payables WHERE id = $1`,
    [validated.payableId]
  );
  if (payRes.rows.length === 0) {
    throw new Error("Conta a pagar não encontrada.");
  }
  const payable = payRes.rows[0];
  const totalCents = toCents(Number(payable.original_amount));

  // 2. Validar centros de custo ativos
  const costCenterIds = validated.allocations.map((a) => a.costCenterId);
  const ccRes = await query<{ id: string; status: string }>(
    `SELECT id, status FROM cost_centers WHERE id = ANY($1::uuid[])`,
    [costCenterIds]
  );
  if (ccRes.rows.length !== costCenterIds.length) {
    throw new Error("Um ou mais centros de custo informados não existem.");
  }

  // 3. Validação de Centavos Exatos
  // Calcular soma de centavos das alocações
  let sumAllocCents = 0;
  for (const alloc of validated.allocations) {
    sumAllocCents += toCents(alloc.amount);
  }

  if (Math.abs(sumAllocCents - totalCents) > 1) {
    throw new Error(
      `A soma dos rateios (R$ ${(sumAllocCents / 100).toFixed(2)}) deve ser exatamente igual ao valor do título (R$ ${(totalCents / 100).toFixed(2)}).`
    );
  }

  // Ajustar diferença residual de 1 centavo na última parcela
  const diffCents = totalCents - sumAllocCents;
  if (diffCents !== 0 && validated.allocations.length > 0) {
    const last = validated.allocations[validated.allocations.length - 1];
    last.amount = fromCents(toCents(last.amount) + diffCents);
  }

  // 4. Gravação atômica: deletar/inativar alocações anteriores e inserir novas
  await query(
    `DELETE FROM financial_cost_center_allocations WHERE payable_id = $1`,
    [validated.payableId]
  );

  for (const alloc of validated.allocations) {
    await query(
      `INSERT INTO financial_cost_center_allocations 
        (payable_id, cost_center_id, percentage, amount, status, notes)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
      [validated.payableId, alloc.costCenterId, alloc.percentage, alloc.amount, alloc.notes || null]
    );
  }

  // Atualizar centro de custo padrão do payable com o de maior percentual
  const primaryAlloc = [...validated.allocations].sort((a, b) => b.percentage - a.percentage)[0];
  if (primaryAlloc) {
    await query(`UPDATE payables SET cost_center_id = $1 WHERE id = $2`, [
      primaryAlloc.costCenterId,
      validated.payableId,
    ]);
  }
}

// ----------------------------------------------------------------------
// 2. Plano Gerencial & Apropriações de Receita
// ----------------------------------------------------------------------

export async function getManagerialAccounts(): Promise<ManagerialAccountRecord[]> {
  const sql = `
    SELECT 
      id, code, name,
      classification_group as "classificationGroup",
      subgroup,
      display_order as "displayOrder",
      status,
      created_at as "createdAt"
    FROM managerial_accounts
    WHERE status = 'ACTIVE'
    ORDER BY display_order ASC, code ASC
  `;
  const result = await query<ManagerialAccountRecord>(sql);
  return result.rows;
}

export async function recognizeContractRevenue(input: {
  contractId: string;
  competencyMonth: string; // YYYY-MM
  grossAmount: number;
  deductionsAmount?: number;
  notes?: string | null;
}): Promise<RevenueAccrualRecord> {
  const grossCents = toCents(input.grossAmount);
  const deductionsCents = toCents(input.deductionsAmount || 0);
  const netCents = Math.max(0, grossCents - deductionsCents);

  // Buscar cliente do contrato
  const contractRes = await query<{ client_id: string }>(
    `SELECT client_id FROM contracts WHERE id = $1`,
    [input.contractId]
  );
  if (contractRes.rows.length === 0) {
    throw new Error("Contrato não encontrado para reconhecimento de receita.");
  }
  const clientId = contractRes.rows[0].client_id;

  const sql = `
    INSERT INTO revenue_accruals 
      (contract_id, client_id, competency_month, gross_amount, deductions_amount, net_amount, status, recognition_rule, notes)
    VALUES ($1, $2, $3, $4, $5, $6, 'RECOGNIZED', 'MONTHLY_CONTRACT', $7)
    ON CONFLICT (contract_id, competency_month) WHERE contract_id IS NOT NULL AND status <> 'CANCELED'
    DO UPDATE SET
      gross_amount = EXCLUDED.gross_amount,
      deductions_amount = EXCLUDED.deductions_amount,
      net_amount = EXCLUDED.net_amount,
      notes = EXCLUDED.notes
    RETURNING 
      id, contract_id as "contractId", receivable_id as "receivableId",
      client_id as "clientId", competency_month as "competencyMonth",
      gross_amount::float as "grossAmount",
      deductions_amount::float as "deductionsAmount",
      net_amount::float as "netAmount",
      status, recognition_rule as "recognitionRule", notes,
      created_at as "createdAt"
  `;
  const res = await query<RevenueAccrualRecord>(sql, [
    input.contractId,
    clientId,
    input.competencyMonth,
    fromCents(grossCents),
    fromCents(deductionsCents),
    fromCents(netCents),
    input.notes || null,
  ]);
  return res.rows[0];
}

// ----------------------------------------------------------------------
// 3. Motor de Cálculo da DRE (Regime de Caixa e Regime de Competência)
// ----------------------------------------------------------------------

interface DRECalculationOptions {
  competency: string; // YYYY-MM
  accountingMethod: AccountingMethod;
  costCenterId?: string | null;
}

export async function getDREStatementForMonth(
  options: DRECalculationOptions
): Promise<DREPeriodStatement> {
  const { competency, accountingMethod, costCenterId } = options;

  let costCenterName: string | null = null;
  if (costCenterId) {
    const cc = await query<{ name: string }>(`SELECT name FROM cost_centers WHERE id = $1`, [
      costCenterId,
    ]);
    if (cc.rows.length > 0) costCenterName = cc.rows[0].name;
  }

  // Inicializar acumuladores em centavos
  let grossRevenueCents = 0;
  let deductionsCents = 0;
  let directCostsCents = 0;
  let adminExpCents = 0;
  let commExpCents = 0;
  let techExpCents = 0;
  let otherExpCents = 0;
  let nonOperationalCents = 0;
  let unclassifiedCents = 0;
  let unclassifiedCount = 0;

  const grossItems: DREPeriodStatement["grossRevenueItems"] = [];
  const deductionItems: DREPeriodStatement["deductionItems"] = [];
  const directCostItems: DREPeriodStatement["directCostItems"] = [];
  const opLines: DREPeriodStatement["operationalExpenseItems"]["lines"] = [];
  const nonOpItems: DREPeriodStatement["nonOperationalItems"] = [];
  const unclassifiedItems: DREPeriodStatement["unclassified"]["items"] = [];

  if (accountingMethod === "CASH") {
    // -------------------------------------------------------------
    // REGIME DE CAIXA: Liquidacoes Efetivadas no Mes (settlement_date)
    // -------------------------------------------------------------
    const startOfMonth = `${competency}-01`;
    // Calcular ultimo dia do mes
    const [yearStr, monthStr] = competency.split("-");
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const endDay = new Date(y, m, 0).getDate();
    const endOfMonth = `${competency}-${String(endDay).padStart(2, "0")}`;

    // A. Recebimentos no Caixa (settlement_type = 'RECEIPT' e nao estornado)
    const receiptsSql = `
      SELECT 
        s.id,
        s.amount::float as amount,
        s.settlement_date as date,
        s.notes,
        c.name as client_name,
        r.description as receivable_desc,
        r.receivable_number
      FROM financial_settlements s
      JOIN receivables r ON r.id = s.receivable_id
      JOIN clients c ON c.id = r.client_id
      WHERE s.settlement_type = 'RECEIPT'
        AND s.is_reversed = false
        AND s.settlement_date >= $1 AND s.settlement_date <= $2
      ORDER BY s.settlement_date ASC
    `;
    const receiptsRes = await query<{
      id: string;
      amount: number;
      date: string;
      notes: string | null;
      client_name: string;
      receivable_desc: string;
      receivable_number: string;
    }>(receiptsSql, [startOfMonth, endOfMonth]);

    const receiptEntries = receiptsRes.rows.map((r) => ({
      id: r.id,
      description: `${r.receivable_number} - ${r.receivable_desc}`,
      entityName: r.client_name,
      date: String(r.date).substring(0, 10),
      amount: r.amount,
    }));

    const totalReceiptsCents = receiptEntries.reduce((acc, curr) => acc + toCents(curr.amount), 0);
    grossRevenueCents += totalReceiptsCents;

    if (receiptEntries.length > 0) {
      grossItems.push({
        id: "cash-receipts",
        code: "1.01",
        name: "Recebimentos Efetivados em Caixa",
        amount: fromCents(totalReceiptsCents),
        percentageOfRevenue: 100,
        originCount: receiptEntries.length,
        originEntries: receiptEntries,
      });
    }

    // B. Pagamentos Efetivados no Caixa (settlement_type = 'PAYMENT' e nao estornado)
    const paymentsSql = `
      SELECT 
        s.id,
        s.amount::float as amount,
        s.settlement_date as date,
        p.id as payable_id,
        p.payable_number,
        p.description as payable_desc,
        p.supplier_name,
        p.cost_center_id,
        p.managerial_account_id,
        cc.id as cost_center_id_direct,
        cc.code as cost_center_code,
        cc.name as cost_center_name,
        ma.code as managerial_code,
        ma.name as managerial_name,
        ma.classification_group,
        ma.subgroup
      FROM financial_settlements s
      JOIN payables p ON p.id = s.payable_id
      LEFT JOIN cost_centers cc ON cc.id = p.cost_center_id
      LEFT JOIN managerial_accounts ma ON ma.id = p.managerial_account_id
      WHERE s.settlement_type = 'PAYMENT'
        AND s.is_reversed = false
        AND s.settlement_date >= $1 AND s.settlement_date <= $2
      ORDER BY s.settlement_date ASC
    `;
    const paymentsRes = await query<{
      id: string;
      amount: number;
      date: string;
      payable_id: string;
      payable_number: string;
      payable_desc: string;
      supplier_name: string;
      cost_center_id: string | null;
      cost_center_code: string | null;
      cost_center_name: string | null;
      managerial_code: string | null;
      managerial_name: string | null;
      classification_group: string | null;
      subgroup: string | null;
    }>(paymentsSql, [startOfMonth, endOfMonth]);

    for (const p of paymentsRes.rows) {
      const pCents = toCents(p.amount);
      const isUnclassified = !p.classification_group || p.classification_group === "UNCLASSIFIED";

      // Checar se o payable possui rateio por centros de custo
      const allocs = await getPayableAllocations(p.payable_id);

      if (isUnclassified) {
        unclassifiedCents += pCents;
        unclassifiedCount += 1;
        unclassifiedItems.push({
          id: p.id,
          description: `${p.payable_number} - ${p.payable_desc}`,
          amount: p.amount,
          date: String(p.date).substring(0, 10),
          source: "SETTLEMENT",
        });
        continue;
      }

      if (p.classification_group === "DIRECT_COST") {
        if (!costCenterId || p.cost_center_id === costCenterId) {
          directCostsCents += pCents;
          directCostItems.push({
            id: p.id,
            code: p.managerial_code || "3.01",
            name: p.managerial_name || "Custo Direto",
            amount: p.amount,
            percentageOfRevenue: grossRevenueCents > 0 ? (pCents / grossRevenueCents) * 100 : 0,
            originCount: 1,
            originEntries: [
              {
                id: p.id,
                description: `${p.payable_number} - ${p.payable_desc}`,
                entityName: p.supplier_name,
                date: String(p.date).substring(0, 10),
                amount: p.amount,
                costCenter: p.cost_center_code || undefined,
              },
            ],
          });
        }
      } else if (p.classification_group === "OPERATIONAL_EXPENSE") {
        // Se houver rateio por centros de custo
        if (allocs.length > 0) {
          for (const al of allocs) {
            if (costCenterId && al.costCenterId !== costCenterId) continue;
            const alCents = toCents(al.amount);
            if (al.costCenterCode === "ADM") adminExpCents += alCents;
            else if (al.costCenterCode === "COM") commExpCents += alCents;
            else if (al.costCenterCode === "TEC") techExpCents += alCents;
            else otherExpCents += alCents;

            opLines.push({
              id: `${p.id}-${al.id}`,
              code: p.managerial_code || "4.02",
              name: `${p.managerial_name || "Despesa Operacional"} (${al.costCenterCode || "Rateado"})`,
              amount: al.amount,
              percentageOfRevenue: grossRevenueCents > 0 ? (alCents / grossRevenueCents) * 100 : 0,
              originCount: 1,
              originEntries: [
                {
                  id: p.id,
                  description: `${p.payable_number} - ${p.payable_desc} (${al.percentage}%)`,
                  entityName: p.supplier_name,
                  date: String(p.date).substring(0, 10),
                  amount: al.amount,
                  costCenter: al.costCenterCode,
                },
              ],
            });
          }
        } else {
          // Sem rateio, aplicar no centro de custo do payable
          if (!costCenterId || p.cost_center_id === costCenterId) {
            if (p.subgroup === "ADMINISTRATIVE" || p.cost_center_code === "ADM") adminExpCents += pCents;
            else if (p.subgroup === "COMMERCIAL" || p.cost_center_code === "COM") commExpCents += pCents;
            else if (p.subgroup === "TECHNOLOGY" || p.cost_center_code === "TEC") techExpCents += pCents;
            else otherExpCents += pCents;

            opLines.push({
              id: p.id,
              code: p.managerial_code || "4.02",
              name: p.managerial_name || "Despesa Operacional",
              amount: p.amount,
              percentageOfRevenue: grossRevenueCents > 0 ? (pCents / grossRevenueCents) * 100 : 0,
              originCount: 1,
              originEntries: [
                {
                  id: p.id,
                  description: `${p.payable_number} - ${p.payable_desc}`,
                  entityName: p.supplier_name,
                  date: String(p.date).substring(0, 10),
                  amount: p.amount,
                  costCenter: p.cost_center_code || undefined,
                },
              ],
            });
          }
        }
      } else if (p.classification_group === "NON_OPERATIONAL") {
        nonOperationalCents += pCents;
        nonOpItems.push({
          id: p.id,
          code: p.managerial_code || "5.01",
          name: p.managerial_name || "Despesa Não Operacional",
          amount: p.amount,
          percentageOfRevenue: grossRevenueCents > 0 ? (pCents / grossRevenueCents) * 100 : 0,
          originCount: 1,
          originEntries: [
            {
              id: p.id,
              description: `${p.payable_number} - ${p.payable_desc}`,
              entityName: p.supplier_name,
              date: String(p.date).substring(0, 10),
              amount: p.amount,
            },
          ],
        });
      }
    }
  } else {
    // -------------------------------------------------------------
    // REGIME DE COMPETÊNCIA: Competência YYYY-MM
    // -------------------------------------------------------------

    // A. Receitas Reconhecidas
    // 1. De revenue_accruals
    const accrualsSql = `
      SELECT 
        ra.id,
        ra.gross_amount::float as gross_amount,
        ra.deductions_amount::float as deductions_amount,
        ra.net_amount::float as net_amount,
        ra.contract_id,
        ra.receivable_id,
        c.name as client_name,
        co.contract_number
      FROM revenue_accruals ra
      JOIN clients c ON c.id = ra.client_id
      LEFT JOIN contracts co ON co.id = ra.contract_id
      WHERE ra.competency_month = $1 AND ra.status = 'RECOGNIZED'
    `;
    const accrualsRes = await query<{
      id: string;
      gross_amount: number;
      deductions_amount: number;
      net_amount: number;
      contract_id: string | null;
      receivable_id: string | null;
      client_name: string;
      contract_number: string | null;
    }>(accrualsSql, [competency]);

    // 2. De receivables na competência que não possuam revenue_accrual explícito
    const accrualContractIds = accrualsRes.rows
      .map((r) => r.contract_id)
      .filter((id): id is string => Boolean(id));

    const recsSql = `
      SELECT 
        r.id,
        r.original_amount::float as amount,
        r.receivable_number,
        r.description,
        r.due_date,
        c.name as client_name
      FROM receivables r
      JOIN clients c ON c.id = r.client_id
      WHERE r.competency = $1
        AND r.status <> 'CANCELED'
        AND (r.contract_id IS NULL OR r.contract_id <> ALL($2::uuid[]))
    `;
    const recsRes = await query<{
      id: string;
      amount: number;
      receivable_number: string;
      description: string;
      due_date: string;
      client_name: string;
    }>(recsSql, [competency, accrualContractIds.length > 0 ? accrualContractIds : ["00000000-0000-0000-0000-000000000000"]]);

    const revenueEntries: DRELineItem["originEntries"] = [];

    for (const a of accrualsRes.rows) {
      grossRevenueCents += toCents(a.gross_amount);
      deductionsCents += toCents(a.deductions_amount);
      revenueEntries.push({
        id: a.id,
        description: `Contrato ${a.contract_number || "Recorrente"} - Apropriação Mensal`,
        entityName: a.client_name,
        date: `${competency}-01`,
        amount: a.gross_amount,
      });
    }

    for (const r of recsRes.rows) {
      grossRevenueCents += toCents(r.amount);
      revenueEntries.push({
        id: r.id,
        description: `${r.receivable_number} - ${r.description}`,
        entityName: r.client_name,
        date: String(r.due_date).substring(0, 10),
        amount: r.amount,
      });
    }

    if (revenueEntries.length > 0) {
      grossItems.push({
        id: "accrual-revenue",
        code: "1.01",
        name: "Receita de Serviços Reconhecida",
        amount: fromCents(grossRevenueCents),
        percentageOfRevenue: 100,
        originCount: revenueEntries.length,
        originEntries: revenueEntries,
      });
    }

    if (deductionsCents > 0) {
      deductionItems.push({
        id: "accrual-deductions",
        code: "2.01",
        name: "Deduções e Impostos sobre Receita",
        amount: fromCents(deductionsCents),
        percentageOfRevenue: grossRevenueCents > 0 ? (deductionsCents / grossRevenueCents) * 100 : 0,
        originCount: accrualsRes.rows.filter((a) => a.deductions_amount > 0).length,
      });
    }

    // B. Custos Diretos dos Serviços (Cost Accruals da Fase 6)
    const costAccrualsSql = `
      SELECT 
        ca.id,
        ca.accrual_amount::float as amount,
        s.name as supplier_name,
        co.contract_number,
        srv.name as service_name
      FROM cost_accruals ca
      LEFT JOIN suppliers s ON s.id = ca.supplier_id
      LEFT JOIN contracts co ON co.id = ca.contract_id
      LEFT JOIN services srv ON srv.id = ca.service_id
      WHERE ca.competency_month = $1 AND ca.status = 'ACCRUED'
    `;
    const costAccrualsRes = await query<{
      id: string;
      amount: number;
      supplier_name: string | null;
      contract_number: string | null;
      service_name: string | null;
    }>(costAccrualsSql, [competency]);

    for (const ca of costAccrualsRes.rows) {
      const cCents = toCents(ca.amount);
      directCostsCents += cCents;
      directCostItems.push({
        id: ca.id,
        code: "3.01",
        name: `Custo Direto: ${ca.service_name || "Serviço Fornecedor"}`,
        amount: ca.amount,
        percentageOfRevenue: grossRevenueCents > 0 ? (cCents / grossRevenueCents) * 100 : 0,
        originCount: 1,
        originEntries: [
          {
            id: ca.id,
            description: `Apropriação Contrato ${ca.contract_number || "Geral"}`,
            entityName: ca.supplier_name || "Fornecedor",
            date: `${competency}-01`,
            amount: ca.amount,
          },
        ],
      });
    }

    // C. Títulos a Pagar na Competência (Despesas Operacionais e Custos Diretos Não Apropriados)
    const payablesSql = `
      SELECT 
        p.id,
        p.payable_number,
        p.description,
        p.due_date,
        p.original_amount::float as amount,
        p.supplier_name,
        p.cost_center_id,
        p.managerial_account_id,
        cc.code as cost_center_code,
        cc.name as cost_center_name,
        ma.code as managerial_code,
        ma.name as managerial_name,
        ma.classification_group,
        ma.subgroup
      FROM payables p
      LEFT JOIN cost_centers cc ON cc.id = p.cost_center_id
      LEFT JOIN managerial_accounts ma ON ma.id = p.managerial_account_id
      WHERE p.competency = $1 AND p.status <> 'CANCELED'
    `;
    const payablesRes = await query<{
      id: string;
      payable_number: string;
      description: string;
      due_date: string;
      amount: number;
      supplier_name: string;
      cost_center_id: string | null;
      cost_center_code: string | null;
      cost_center_name: string | null;
      managerial_code: string | null;
      managerial_name: string | null;
      classification_group: string | null;
      subgroup: string | null;
    }>(payablesSql, [competency]);

    for (const p of payablesRes.rows) {
      const pCents = toCents(p.amount);
      const isUnclassified = !p.classification_group || p.classification_group === "UNCLASSIFIED";

      if (isUnclassified) {
        unclassifiedCents += pCents;
        unclassifiedCount += 1;
        unclassifiedItems.push({
          id: p.id,
          description: `${p.payable_number} - ${p.description}`,
          amount: p.amount,
          date: String(p.due_date).substring(0, 10),
          source: "PAYABLE",
        });
        continue;
      }

      const allocs = await getPayableAllocations(p.id);

      if (p.classification_group === "DIRECT_COST") {
        if (!costCenterId || p.cost_center_id === costCenterId) {
          directCostsCents += pCents;
          directCostItems.push({
            id: p.id,
            code: p.managerial_code || "3.01",
            name: p.managerial_name || "Custo Direto",
            amount: p.amount,
            percentageOfRevenue: grossRevenueCents > 0 ? (pCents / grossRevenueCents) * 100 : 0,
            originCount: 1,
            originEntries: [
              {
                id: p.id,
                description: `${p.payable_number} - ${p.description}`,
                entityName: p.supplier_name,
                date: String(p.due_date).substring(0, 10),
                amount: p.amount,
                costCenter: p.cost_center_code || undefined,
              },
            ],
          });
        }
      } else if (p.classification_group === "OPERATIONAL_EXPENSE") {
        if (allocs.length > 0) {
          for (const al of allocs) {
            if (costCenterId && al.costCenterId !== costCenterId) continue;
            const alCents = toCents(al.amount);
            if (al.costCenterCode === "ADM") adminExpCents += alCents;
            else if (al.costCenterCode === "COM") commExpCents += alCents;
            else if (al.costCenterCode === "TEC") techExpCents += alCents;
            else otherExpCents += alCents;

            opLines.push({
              id: `${p.id}-${al.id}`,
              code: p.managerial_code || "4.02",
              name: `${p.managerial_name || "Despesa Operacional"} (${al.costCenterCode || "Rateado"})`,
              amount: al.amount,
              percentageOfRevenue: grossRevenueCents > 0 ? (alCents / grossRevenueCents) * 100 : 0,
              originCount: 1,
              originEntries: [
                {
                  id: p.id,
                  description: `${p.payable_number} - ${p.description} (${al.percentage}%)`,
                  entityName: p.supplier_name,
                  date: String(p.due_date).substring(0, 10),
                  amount: al.amount,
                  costCenter: al.costCenterCode,
                },
              ],
            });
          }
        } else {
          if (!costCenterId || p.cost_center_id === costCenterId) {
            if (p.subgroup === "ADMINISTRATIVE" || p.cost_center_code === "ADM") adminExpCents += pCents;
            else if (p.subgroup === "COMMERCIAL" || p.cost_center_code === "COM") commExpCents += pCents;
            else if (p.subgroup === "TECHNOLOGY" || p.cost_center_code === "TEC") techExpCents += pCents;
            else otherExpCents += pCents;

            opLines.push({
              id: p.id,
              code: p.managerial_code || "4.02",
              name: p.managerial_name || "Despesa Operacional",
              amount: p.amount,
              percentageOfRevenue: grossRevenueCents > 0 ? (pCents / grossRevenueCents) * 100 : 0,
              originCount: 1,
              originEntries: [
                {
                  id: p.id,
                  description: `${p.payable_number} - ${p.description}`,
                  entityName: p.supplier_name,
                  date: String(p.due_date).substring(0, 10),
                  amount: p.amount,
                  costCenter: p.cost_center_code || undefined,
                },
              ],
            });
          }
        }
      } else if (p.classification_group === "NON_OPERATIONAL") {
        nonOperationalCents += pCents;
        nonOpItems.push({
          id: p.id,
          code: p.managerial_code || "5.01",
          name: p.managerial_name || "Despesa Não Operacional",
          amount: p.amount,
          percentageOfRevenue: grossRevenueCents > 0 ? (pCents / grossRevenueCents) * 100 : 0,
          originCount: 1,
          originEntries: [
            {
              id: p.id,
              description: `${p.payable_number} - ${p.description}`,
              entityName: p.supplier_name,
              date: String(p.due_date).substring(0, 10),
              amount: p.amount,
            },
          ],
        });
      }
    }
  }

  // Cálculos Gerenciais Hierárquicos
  const netRevenueCents = Math.max(0, grossRevenueCents - deductionsCents);
  const contributionMarginCents = netRevenueCents - directCostsCents;
  const totalOpExpCents = adminExpCents + commExpCents + techExpCents + otherExpCents;
  const operationalResultCents = contributionMarginCents - totalOpExpCents;
  const netManagerialResultCents = operationalResultCents - nonOperationalCents;

  const netRevFloat = fromCents(netRevenueCents);
  const contribFloat = fromCents(contributionMarginCents);
  const opResFloat = fromCents(operationalResultCents);
  const netManagerialFloat = fromCents(netManagerialResultCents);

  const contribPct = netRevFloat > 0 ? Number(((contribFloat / netRevFloat) * 100).toFixed(2)) : 0;
  const opResPct = netRevFloat > 0 ? Number(((opResFloat / netRevFloat) * 100).toFixed(2)) : 0;
  const netManagerialPct =
    netRevFloat > 0 ? Number(((netManagerialFloat / netRevFloat) * 100).toFixed(2)) : 0;

  // -------------------------------------------------------------
  // Indicadores de Conciliação e Integridade Gerencial
  // -------------------------------------------------------------
  // Contratos Ativos
  const activeContractsRes = await query<{ sum: string }>(
    `SELECT COALESCE(SUM(cv.total_amount), 0) as sum 
     FROM contract_versions cv
     JOIN contracts c ON c.id = cv.contract_id
     WHERE c.status = 'ACTIVE' 
       AND cv.version_number = (
         SELECT MAX(cv2.version_number) 
         FROM contract_versions cv2 
         WHERE cv2.contract_id = c.id
       )`
  );
  const contractedRev = Number(activeContractsRes.rows[0]?.sum || 0);

  // Recebíveis Emitidos (Faturados)
  const invoicedRes = await query<{ sum: string }>(
    `SELECT COALESCE(SUM(original_amount), 0) as sum FROM receivables WHERE competency = $1 AND status <> 'CANCELED'`,
    [competency]
  );
  const invoicedRev = Number(invoicedRes.rows[0]?.sum || 0);

  // Oportunidades Ganhas / Propostas Aprovadas
  const propRes = await query<{ sum: string }>(
    `SELECT COALESCE(SUM(pv.total_one_time_effective + pv.total_monthly_effective + pv.total_yearly_effective), 0) as sum 
     FROM proposal_versions pv 
     JOIN proposals p ON p.id = pv.proposal_id 
     WHERE p.status = 'APPROVED' AND pv.version_number = p.approved_version_number`
  );
  const projectedRev = Number(propRes.rows[0]?.sum || 0);

  return {
    periodKey: competency,
    accountingMethod,
    costCenterId: costCenterId || null,
    costCenterName,

    grossRevenue: fromCents(grossRevenueCents),
    grossRevenueItems: grossItems,

    deductions: fromCents(deductionsCents),
    deductionItems: deductionItems,

    netRevenue: netRevFloat,

    directCosts: fromCents(directCostsCents),
    directCostItems: directCostItems,

    contributionMargin: contribFloat,
    contributionMarginPercentage: contribPct,

    operationalExpenses: fromCents(totalOpExpCents),
    operationalExpenseItems: {
      administrative: fromCents(adminExpCents),
      commercial: fromCents(commExpCents),
      technology: fromCents(techExpCents),
      other: fromCents(otherExpCents),
      lines: opLines,
    },

    operationalResult: opResFloat,
    operationalResultPercentage: opResPct,

    nonOperationalResult: fromCents(nonOperationalCents),
    nonOperationalItems: nonOpItems,

    netManagerialResult: netManagerialFloat,
    netManagerialResultPercentage: netManagerialPct,

    unclassified: {
      total: fromCents(unclassifiedCents),
      count: unclassifiedCount,
      items: unclassifiedItems,
    },

    reconciliationKpis: {
      projectedRevenue: projectedRev,
      contractedRevenue: contractedRev,
      invoicedRevenue: invoicedRev,
      receivedCash: accountingMethod === "CASH" ? fromCents(grossRevenueCents) : invoicedRev,
      recognizedRevenue: fromCents(grossRevenueCents),
      projectedExpenses: fromCents(totalOpExpCents + directCostsCents),
      incurredExpenses: fromCents(totalOpExpCents + directCostsCents),
      paidCash: fromCents(totalOpExpCents + directCostsCents),
      appropriatedCost: fromCents(directCostsCents),
    },
  };
}

export async function getDREAnnualStatement(options: {
  year: number;
  accountingMethod: AccountingMethod;
  costCenterId?: string | null;
}): Promise<DREMultiPeriodResult> {
  const { year, accountingMethod, costCenterId } = options;
  const periods: DREPeriodStatement[] = [];

  let grossCents = 0;
  let deductionsCents = 0;
  let directCostsCents = 0;
  let adminExpCents = 0;
  let commExpCents = 0;
  let techExpCents = 0;
  let otherExpCents = 0;
  let nonOpCents = 0;
  let unclassifiedCents = 0;
  let unclassifiedCount = 0;

  for (let m = 1; m <= 12; m++) {
    const competency = `${year}-${String(m).padStart(2, "0")}`;
    const periodStmt = await getDREStatementForMonth({
      competency,
      accountingMethod,
      costCenterId,
    });
    periods.push(periodStmt);

    grossCents += toCents(periodStmt.grossRevenue);
    deductionsCents += toCents(periodStmt.deductions);
    directCostsCents += toCents(periodStmt.directCosts);
    adminExpCents += toCents(periodStmt.operationalExpenseItems.administrative);
    commExpCents += toCents(periodStmt.operationalExpenseItems.commercial);
    techExpCents += toCents(periodStmt.operationalExpenseItems.technology);
    otherExpCents += toCents(periodStmt.operationalExpenseItems.other);
    nonOpCents += toCents(periodStmt.nonOperationalResult);
    unclassifiedCents += toCents(periodStmt.unclassified.total);
    unclassifiedCount += periodStmt.unclassified.count;
  }

  const netRevCents = grossCents - deductionsCents;
  const contribCents = netRevCents - directCostsCents;
  const totalOpCents = adminExpCents + commExpCents + techExpCents + otherExpCents;
  const opResCents = contribCents - totalOpCents;
  const netManagerialCents = opResCents - nonOpCents;

  const netRevFloat = fromCents(netRevCents);
  const contribFloat = fromCents(contribCents);
  const opResFloat = fromCents(opResCents);
  const netManagerialFloat = fromCents(netManagerialCents);

  const consolidated: DREPeriodStatement = {
    periodKey: String(year),
    accountingMethod,
    costCenterId: costCenterId || null,
    costCenterName: null,

    grossRevenue: fromCents(grossCents),
    grossRevenueItems: [],
    deductions: fromCents(deductionsCents),
    deductionItems: [],
    netRevenue: netRevFloat,
    directCosts: fromCents(directCostsCents),
    directCostItems: [],
    contributionMargin: contribFloat,
    contributionMarginPercentage:
      netRevFloat > 0 ? Number(((contribFloat / netRevFloat) * 100).toFixed(2)) : 0,

    operationalExpenses: fromCents(totalOpCents),
    operationalExpenseItems: {
      administrative: fromCents(adminExpCents),
      commercial: fromCents(commExpCents),
      technology: fromCents(techExpCents),
      other: fromCents(otherExpCents),
      lines: [],
    },

    operationalResult: opResFloat,
    operationalResultPercentage:
      netRevFloat > 0 ? Number(((opResFloat / netRevFloat) * 100).toFixed(2)) : 0,

    nonOperationalResult: fromCents(nonOpCents),
    nonOperationalItems: [],

    netManagerialResult: netManagerialFloat,
    netManagerialResultPercentage:
      netRevFloat > 0 ? Number(((netManagerialFloat / netRevFloat) * 100).toFixed(2)) : 0,

    unclassified: {
      total: fromCents(unclassifiedCents),
      count: unclassifiedCount,
      items: [],
    },

    reconciliationKpis: {
      projectedRevenue: 0,
      contractedRevenue: 0,
      invoicedRevenue: 0,
      receivedCash: fromCents(grossCents),
      recognizedRevenue: fromCents(grossCents),
      projectedExpenses: fromCents(totalOpCents + directCostsCents),
      incurredExpenses: fromCents(totalOpCents + directCostsCents),
      paidCash: fromCents(totalOpCents + directCostsCents),
      appropriatedCost: fromCents(directCostsCents),
    },
  };

  return {
    accountingMethod,
    year,
    periods,
    consolidated,
  };
}

// ----------------------------------------------------------------------
// 4. Exportação CSV da DRE
// ----------------------------------------------------------------------

export function exportDREStatementToCSV(stmt: DREPeriodStatement): string {
  const lines: string[] = [];
  lines.push(`OTIMIZZA ERP - DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE GERENCIAL)`);
  lines.push(`Período;${stmt.periodKey}`);
  lines.push(`Regime;${stmt.accountingMethod === "CASH" ? "Regime de Caixa" : "Regime de Competência"}`);
  if (stmt.costCenterName) {
    lines.push(`Centro de Custo;${stmt.costCenterName}`);
  }
  lines.push("");
  lines.push(`Código;Estrutura da DRE;Valor (R$);% Receita Líquida`);

  lines.push(`1;Receita Bruta;${stmt.grossRevenue.toFixed(2)};-`);
  for (const item of stmt.grossRevenueItems) {
    lines.push(`  ${item.code};  ${item.name};${item.amount.toFixed(2)};-`);
  }

  lines.push(`2;(-) Deduções e Impostos;-${stmt.deductions.toFixed(2)};-`);
  for (const item of stmt.deductionItems) {
    lines.push(`  ${item.code};  ${item.name};-${item.amount.toFixed(2)};-`);
  }

  lines.push(`3;(=) Receita Líquida;${stmt.netRevenue.toFixed(2)};100,00%`);

  lines.push(`4;(-) Custos Diretos dos Serviços;-${stmt.directCosts.toFixed(2)};${((stmt.directCosts / (stmt.netRevenue || 1)) * 100).toFixed(2)}%`);
  for (const item of stmt.directCostItems) {
    lines.push(`  ${item.code};  ${item.name};-${item.amount.toFixed(2)};${item.percentageOfRevenue.toFixed(2)}%`);
  }

  lines.push(`5;(=) Margem de Contribuição;${stmt.contributionMargin.toFixed(2)};${stmt.contributionMarginPercentage.toFixed(2)}%`);

  lines.push(`6;(-) Despesas Operacionais;-${stmt.operationalExpenses.toFixed(2)};${((stmt.operationalExpenses / (stmt.netRevenue || 1)) * 100).toFixed(2)}%`);
  lines.push(`  4.01;  Despesas Comerciais;-${stmt.operationalExpenseItems.commercial.toFixed(2)};${((stmt.operationalExpenseItems.commercial / (stmt.netRevenue || 1)) * 100).toFixed(2)}%`);
  lines.push(`  4.02;  Despesas Administrativas;-${stmt.operationalExpenseItems.administrative.toFixed(2)};${((stmt.operationalExpenseItems.administrative / (stmt.netRevenue || 1)) * 100).toFixed(2)}%`);
  lines.push(`  4.03;  Despesas de Tecnologia;-${stmt.operationalExpenseItems.technology.toFixed(2)};${((stmt.operationalExpenseItems.technology / (stmt.netRevenue || 1)) * 100).toFixed(2)}%`);
  if (stmt.operationalExpenseItems.other > 0) {
    lines.push(`  4.04;  Outras Despesas Operacionais;-${stmt.operationalExpenseItems.other.toFixed(2)};${((stmt.operationalExpenseItems.other / (stmt.netRevenue || 1)) * 100).toFixed(2)}%`);
  }

  lines.push(`7;(=) Resultado Operacional Gerencial;${stmt.operationalResult.toFixed(2)};${stmt.operationalResultPercentage.toFixed(2)}%`);

  if (stmt.nonOperationalResult !== 0) {
    lines.push(`8;(+/-) Resultado Não Operacional / Financeiro;${stmt.nonOperationalResult.toFixed(2)};-`);
  }

  lines.push(`9;(=) Resultado Líquido Gerencial;${stmt.netManagerialResult.toFixed(2)};${stmt.netManagerialResultPercentage.toFixed(2)}%`);

  if (stmt.unclassified.count > 0) {
    lines.push("");
    lines.push(`AVISO: LANÇAMENTOS NÃO CLASSIFICADOS`);
    lines.push(`Quantidade;${stmt.unclassified.count}`);
    lines.push(`Valor Total Pendente;${stmt.unclassified.total.toFixed(2)}`);
  }

  return lines.join("\r\n");
}
