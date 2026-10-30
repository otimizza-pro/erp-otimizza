import { query, withTransaction } from "@/lib/db/pool";
import { calculateEffectiveDueDate } from "@/shared/recurrence";
import {
  FinancialStatus,
  ReceivableRecord,
  PayableRecord,
  PayableTemplateRecord,
  SettlementRecord,
  FinancialAccountRecord,
  FinancialCategoryRecord,
  FinancialStatementRecord,
  CashflowReportItem,
  ProfitabilityReportItem,
} from "./types";

function formatDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function computeStatus(dueDateStr: string, originalAmount: number, paidAmount: number, isCanceled: boolean): FinancialStatus {
  if (isCanceled) return "CANCELED";
  if (paidAmount >= originalAmount) return "PAID";
  
  const todayStr = new Date().toISOString().slice(0, 10);
  if (paidAmount > 0) {
    return dueDateStr < todayStr ? "OVERDUE" : "PARTIALLY_PAID";
  }
  return dueDateStr < todayStr ? "OVERDUE" : "PENDING";
}

// ==========================================
// 1. CONTAS FINANCEIRAS E EXTRATO
// ==========================================

export async function listFinancialAccounts(): Promise<FinancialAccountRecord[]> {
  const sql = `SELECT * FROM financial_accounts ORDER BY name ASC`;
  const res = await query(sql);
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    bankName: r.bank_name,
    accountType: r.account_type,
    initialBalance: Number(r.initial_balance),
    currentBalance: Number(r.current_balance),
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }));
}

export async function createFinancialAccount(data: {
  name: string;
  bankName?: string;
  accountType: "CHECKING" | "SAVINGS" | "CASH" | "INVESTMENT";
  initialBalance: number;
}): Promise<FinancialAccountRecord> {
  const initBal = Number(Number(data.initialBalance || 0).toFixed(2));
  const sql = `
    INSERT INTO financial_accounts (name, bank_name, account_type, initial_balance, current_balance)
    VALUES ($1, $2, $3, $4, $4)
    RETURNING *
  `;
  const res = await query(sql, [data.name.trim(), data.bankName?.trim() || null, data.accountType, initBal]);
  const r = res.rows[0];
  return {
    id: r.id,
    name: r.name,
    bankName: r.bank_name,
    accountType: r.account_type,
    initialBalance: Number(r.initial_balance),
    currentBalance: Number(r.current_balance),
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function transferBetweenAccounts(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
}): Promise<{ fromStatementId: string; toStatementId: string }> {
  if (data.fromAccountId === data.toAccountId) {
    throw new Error("A conta de origem e destino não podem ser iguais.");
  }
  const amt = Number(Number(data.amount).toFixed(2));
  if (amt <= 0) {
    throw new Error("Valor de transferência deve ser maior que zero.");
  }

  return await withTransaction(async (client) => {
    // 1. Bloquear ambas as contas em ordem determinística para prevenir deadlock
    const [id1, id2] = [data.fromAccountId, data.toAccountId].sort();
    await client.query("SELECT id, current_balance FROM financial_accounts WHERE id IN ($1, $2) FOR UPDATE", [id1, id2]);

    const fromAccRes = await client.query("SELECT id, name, current_balance FROM financial_accounts WHERE id = $1", [data.fromAccountId]);
    const toAccRes = await client.query("SELECT id, name, current_balance FROM financial_accounts WHERE id = $1", [data.toAccountId]);
    if (fromAccRes.rowCount === 0 || toAccRes.rowCount === 0) {
      throw new Error("Conta de origem ou destino não encontrada.");
    }

    const fromAcc = fromAccRes.rows[0];
    const toAcc = toAccRes.rows[0];

    const newFromBal = Number((Number(fromAcc.current_balance) - amt).toFixed(2));
    const newToBal = Number((Number(toAcc.current_balance) + amt).toFixed(2));

    await client.query("UPDATE financial_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [newFromBal, data.fromAccountId]);
    await client.query("UPDATE financial_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [newToBal, data.toAccountId]);

    // Sequências para statements
    const seq1 = (await client.query<{ next_val: string }>("SELECT nextval('statement_number_seq') AS next_val")).rows[0].next_val;
    const seq2 = (await client.query<{ next_val: string }>("SELECT nextval('statement_number_seq') AS next_val")).rows[0].next_val;
    const num1 = `EXT-${String(seq1).padStart(6, "0")}`;
    const num2 = `EXT-${String(seq2).padStart(6, "0")}`;

    const transferPairId = (await client.query<{ gen_random_uuid: string }>("SELECT gen_random_uuid()")).rows[0].gen_random_uuid;

    const descOut = data.description?.trim() || `Transferência para ${toAcc.name}`;
    const descIn = data.description?.trim() || `Transferência recebida de ${fromAcc.name}`;

    const stmt1 = await client.query(
      `INSERT INTO financial_statements (account_id, statement_number, movement_type, amount, balance_after, movement_date, description, transfer_pair_id)
       VALUES ($1, $2, 'TRANSFER_OUT', $3, $4, $5, $6, $7) RETURNING id`,
      [data.fromAccountId, num1, amt, newFromBal, data.date, descOut, transferPairId]
    );

    const stmt2 = await client.query(
      `INSERT INTO financial_statements (account_id, statement_number, movement_type, amount, balance_after, movement_date, description, transfer_pair_id)
       VALUES ($1, $2, 'TRANSFER_IN', $3, $4, $5, $6, $7) RETURNING id`,
      [data.toAccountId, num2, amt, newToBal, data.date, descIn, transferPairId]
    );

    return {
      fromStatementId: stmt1.rows[0].id,
      toStatementId: stmt2.rows[0].id,
    };
  });
}

// ==========================================
// 2. CONTAS A RECEBER (RECEIVABLES)
// ==========================================

export async function createReceivable(data: {
  clientId: string;
  contractId?: string;
  contractVersionId?: string;
  description: string;
  competency: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  originalAmount: number;
  notes?: string;
  idempotencyKey?: string;
}): Promise<ReceivableRecord> {
  const origAmount = Number(Number(data.originalAmount).toFixed(2));
  if (origAmount <= 0) {
    throw new Error("Valor do título a receber deve ser maior que zero.");
  }
  if (!data.clientId) throw new Error("Cliente é obrigatório.");
  if (!data.competency || !/^\d{4}-\d{2}$/.test(data.competency)) {
    throw new Error("Competência inválida. Formato esperado: AAAA-MM.");
  }

  return await withTransaction(async (client) => {
    // Verificar idempotência se informada
    if (data.idempotencyKey) {
      const existing = await client.query("SELECT * FROM receivables WHERE idempotency_key = $1 AND status <> 'CANCELED'", [data.idempotencyKey]);
      if (existing.rowCount && existing.rowCount > 0) {
        return mapReceivableRow(existing.rows[0]);
      }
    }

    const seqRes = await client.query<{ next_val: string }>("SELECT nextval('receivable_number_seq') AS next_val");
    const recNumber = `REC-${String(seqRes.rows[0].next_val).padStart(5, "0")}`;
    const initialStatus = computeStatus(data.dueDate, origAmount, 0, false);

    const sql = `
      INSERT INTO receivables (
        client_id, contract_id, contract_version_id, receivable_number,
        description, competency, due_date, original_amount, paid_amount,
        balance_amount, status, idempotency_key, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00, $8, $9, $10, $11)
      RETURNING *
    `;
    const res = await client.query(sql, [
      data.clientId,
      data.contractId || null,
      data.contractVersionId || null,
      recNumber,
      data.description.trim(),
      data.competency,
      data.dueDate,
      origAmount,
      initialStatus,
      data.idempotencyKey || null,
      data.notes?.trim() || null,
    ]);

    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('receivables', $1, 'INSERT', $2)`,
      [res.rows[0].id, JSON.stringify({ receivableNumber: recNumber, amount: origAmount, competency: data.competency })]
    );

    return mapReceivableRow(res.rows[0]);
  });
}

export async function getReceivableById(id: string): Promise<ReceivableRecord | null> {
  const sql = `
    SELECT r.*, c.name AS client_name, c.document AS client_document, ct.contract_number
    FROM receivables r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN contracts ct ON ct.id = r.contract_id
    WHERE r.id = $1
  `;
  const res = await query(sql, [id]);
  if (res.rowCount === 0) return null;

  const rec = mapReceivableRow(res.rows[0]);
  // Buscar settlements
  const setSql = `
    SELECT s.*, fa.name AS financial_account_name
    FROM financial_settlements s
    JOIN financial_accounts fa ON fa.id = s.financial_account_id
    WHERE s.receivable_id = $1
    ORDER BY s.created_at ASC
  `;
  const setRes = await query(setSql, [id]);
  rec.settlements = setRes.rows.map((s) => ({
    id: s.id,
    receivableId: s.receivable_id,
    payableId: s.payable_id,
    financialAccountId: s.financial_account_id,
    financialAccountName: s.financial_account_name,
    settlementType: s.settlement_type,
    amount: Number(s.amount),
    settlementDate: formatDate(s.settlement_date) || "",
    notes: s.notes,
    reversedSettlementId: s.reversed_settlement_id,
    isReversed: s.is_reversed,
    createdAt: s.created_at.toISOString(),
  }));

  return rec;
}

export async function listReceivables(params: {
  clientId?: string;
  contractId?: string;
  competency?: string;
  status?: FinancialStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ receivables: ReceivableRecord[]; total: number }> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const conditions: string[] = [];
  const queryParams: unknown[] = [];
  let paramIdx = 1;

  if (params.clientId) {
    conditions.push(`r.client_id = $${paramIdx++}`);
    queryParams.push(params.clientId);
  }
  if (params.contractId) {
    conditions.push(`r.contract_id = $${paramIdx++}`);
    queryParams.push(params.contractId);
  }
  if (params.competency) {
    conditions.push(`r.competency = $${paramIdx++}`);
    queryParams.push(params.competency);
  }
  if (params.status) {
    conditions.push(`r.status = $${paramIdx++}`);
    queryParams.push(params.status);
  }
  if (params.search && params.search.trim()) {
    conditions.push(`(r.receivable_number ILIKE $${paramIdx} OR r.description ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
    queryParams.push(`%${params.search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countSql = `
    SELECT COUNT(r.id) as total
    FROM receivables r
    JOIN clients c ON c.id = r.client_id
    ${whereClause}
  `;
  const countRes = await query<{ total: string }>(countSql, queryParams);
  const total = parseInt(countRes.rows[0]?.total || "0", 10);

  const listSql = `
    SELECT r.*, c.name AS client_name, c.document AS client_document, ct.contract_number
    FROM receivables r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN contracts ct ON ct.id = r.contract_id
    ${whereClause}
    ORDER BY r.due_date DESC, r.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx}
  `;
  queryParams.push(limit, offset);

  const res = await query(listSql, queryParams);
  const receivables = res.rows.map(mapReceivableRow);
  return { receivables, total };
}

// ==========================================
// 3. CONTAS A PAGAR (PAYABLES) E TEMPLATES
// ==========================================

export async function createPayableTemplate(data: {
  supplierName: string;
  categoryId?: string;
  description: string;
  billingPeriod: "MONTHLY" | "YEARLY";
  dueDay: number;
  amount: number;
  startDate: string;
  endDate?: string | null;
  isIndefinite?: boolean;
}): Promise<PayableTemplateRecord> {
  const amt = Number(Number(data.amount).toFixed(2));
  if (amt <= 0) throw new Error("Valor da despesa recorrente deve ser maior que zero.");
  if (!data.supplierName.trim()) throw new Error("Fornecedor/Beneficiário é obrigatório.");

  const sql = `
    INSERT INTO payable_templates (
      supplier_name, category_id, description, billing_period, due_day,
      amount, start_date, end_date, is_indefinite, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
    RETURNING *
  `;
  const res = await query(sql, [
    data.supplierName.trim(),
    data.categoryId || null,
    data.description.trim(),
    data.billingPeriod,
    data.dueDay,
    amt,
    data.startDate,
    data.isIndefinite ? null : data.endDate,
    Boolean(data.isIndefinite),
  ]);
  const r = res.rows[0];
  return {
    id: r.id,
    supplierName: r.supplier_name,
    categoryId: r.category_id,
    description: r.description,
    billingPeriod: r.billing_period,
    dueDay: r.due_day,
    amount: Number(r.amount),
    startDate: formatDate(r.start_date) || "",
    endDate: formatDate(r.end_date),
    isIndefinite: r.is_indefinite,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function createPayable(data: {
  payableTemplateId?: string;
  supplierId?: string;
  supplierName: string;
  supplierNameSnapshot?: string;
  categoryId?: string;
  contractId?: string;
  serviceId?: string;
  description: string;
  competency: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  originalAmount: number;
  notes?: string;
  idempotencyKey?: string;
}): Promise<PayableRecord> {
  const origAmount = Number(Number(data.originalAmount).toFixed(2));
  if (origAmount <= 0) throw new Error("Valor a pagar deve ser maior que zero.");
  if (!data.supplierName.trim()) throw new Error("Fornecedor/Beneficiário é obrigatório.");

  return await withTransaction(async (client) => {
    if (data.idempotencyKey) {
      const existing = await client.query("SELECT * FROM payables WHERE idempotency_key = $1 AND status <> 'CANCELED'", [data.idempotencyKey]);
      if (existing.rowCount && existing.rowCount > 0) {
        return mapPayableRow(existing.rows[0]);
      }
    }

    const finalSupplierId = data.supplierId || null;
    let finalSupplierSnapshot = data.supplierNameSnapshot || data.supplierName.trim();
    if (finalSupplierId && !data.supplierNameSnapshot) {
      const supQ = await client.query<{ name: string }>("SELECT name FROM suppliers WHERE id = $1", [finalSupplierId]);
      if (supQ.rows.length > 0) {
        finalSupplierSnapshot = supQ.rows[0].name;
      }
    }

    const seqRes = await client.query<{ next_val: string }>("SELECT nextval('payable_number_seq') AS next_val");
    const pagNumber = `PAG-${String(seqRes.rows[0].next_val).padStart(5, "0")}`;
    const initialStatus = computeStatus(data.dueDate, origAmount, 0, false);

    const sql = `
      INSERT INTO payables (
        payable_template_id, supplier_id, supplier_name, supplier_name_snapshot,
        category_id, contract_id, service_id, payable_number, description,
        competency, due_date, original_amount, paid_amount, balance_amount,
        allocated_amount, unallocated_amount, status, idempotency_key, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0.00, $12, 0.00, $12, $13, $14, $15)
      RETURNING *
    `;
    const res = await client.query(sql, [
      data.payableTemplateId || null,
      finalSupplierId,
      data.supplierName.trim(),
      finalSupplierSnapshot,
      data.categoryId || null,
      data.contractId || null,
      data.serviceId || null,
      pagNumber,
      data.description.trim(),
      data.competency,
      data.dueDate,
      origAmount,
      initialStatus,
      data.idempotencyKey || null,
      data.notes?.trim() || null,
    ]);

    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('payables', $1, 'INSERT', $2)`,
      [res.rows[0].id, JSON.stringify({ payableNumber: pagNumber, amount: origAmount, supplier: data.supplierName })]
    );

    return mapPayableRow(res.rows[0]);
  });
}

export async function getPayableById(id: string): Promise<PayableRecord | null> {
  const sql = `
    SELECT p.*, fc.name AS category_name, s.name AS service_name
    FROM payables p
    LEFT JOIN financial_categories fc ON fc.id = p.category_id
    LEFT JOIN services s ON s.id = p.service_id
    WHERE p.id = $1
  `;
  const res = await query(sql, [id]);
  if (res.rowCount === 0) return null;

  const pay = mapPayableRow(res.rows[0]);
  const setSql = `
    SELECT s.*, fa.name AS financial_account_name
    FROM financial_settlements s
    JOIN financial_accounts fa ON fa.id = s.financial_account_id
    WHERE s.payable_id = $1
    ORDER BY s.created_at ASC
  `;
  const setRes = await query(setSql, [id]);
  pay.settlements = setRes.rows.map((s) => ({
    id: s.id,
    receivableId: s.receivable_id,
    payableId: s.payable_id,
    financialAccountId: s.financial_account_id,
    financialAccountName: s.financial_account_name,
    settlementType: s.settlement_type,
    amount: Number(s.amount),
    settlementDate: formatDate(s.settlement_date) || "",
    notes: s.notes,
    reversedSettlementId: s.reversed_settlement_id,
    isReversed: s.is_reversed,
    createdAt: s.created_at.toISOString(),
  }));

  return pay;
}

export async function listPayables(params: {
  supplierName?: string;
  competency?: string;
  status?: FinancialStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ payables: PayableRecord[]; total: number }> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const conditions: string[] = [];
  const queryParams: unknown[] = [];
  let paramIdx = 1;

  if (params.supplierName) {
    conditions.push(`p.supplier_name ILIKE $${paramIdx++}`);
    queryParams.push(`%${params.supplierName}%`);
  }
  if (params.competency) {
    conditions.push(`p.competency = $${paramIdx++}`);
    queryParams.push(params.competency);
  }
  if (params.status) {
    conditions.push(`p.status = $${paramIdx++}`);
    queryParams.push(params.status);
  }
  if (params.search && params.search.trim()) {
    conditions.push(`(p.payable_number ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.supplier_name ILIKE $${paramIdx})`);
    queryParams.push(`%${params.search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countSql = `SELECT COUNT(p.id) as total FROM payables p ${whereClause}`;
  const countRes = await query<{ total: string }>(countSql, queryParams);
  const total = parseInt(countRes.rows[0]?.total || "0", 10);

  const listSql = `
    SELECT p.*, fc.name AS category_name, s.name AS service_name
    FROM payables p
    LEFT JOIN financial_categories fc ON fc.id = p.category_id
    LEFT JOIN services s ON s.id = p.service_id
    ${whereClause}
    ORDER BY p.due_date DESC, p.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx}
  `;
  queryParams.push(limit, offset);

  const res = await query(listSql, queryParams);
  const payables = res.rows.map(mapPayableRow);
  return { payables, total };
}

// ==========================================
// 4. MOTOR DE BAIXAS, LIQUIDAÇÃO E ESTORNO
// ==========================================

export async function settleReceivable(data: {
  receivableId: string;
  financialAccountId: string;
  amount: number;
  settlementDate: string; // YYYY-MM-DD
  notes?: string;
}): Promise<ReceivableRecord> {
  const settleAmount = Number(Number(data.amount).toFixed(2));
  if (settleAmount <= 0) throw new Error("Valor do recebimento deve ser maior que zero.");

  await withTransaction(async (client) => {
    // 1. Bloquear o título e a conta para evitar concorrência descontrolada
    const recRes = await client.query(
      "SELECT * FROM receivables WHERE id = $1 FOR UPDATE",
      [data.receivableId]
    );
    if (recRes.rowCount === 0) throw new Error("Título a receber não encontrado.");
    const rec = recRes.rows[0];

    if (rec.status === "CANCELED") throw new Error("Não é possível liquidar um título cancelado.");
    if (rec.status === "PAID") throw new Error("Este título já se encontra totalmente liquidado.");

    const curBalance = Number(rec.balance_amount);
    if (settleAmount > curBalance) {
      throw new Error(`Valor informado (R$ ${settleAmount.toFixed(2)}) excede o saldo restante em aberto (R$ ${curBalance.toFixed(2)}).`);
    }

    const accRes = await client.query(
      "SELECT * FROM financial_accounts WHERE id = $1 FOR UPDATE",
      [data.financialAccountId]
    );
    if (accRes.rowCount === 0) throw new Error("Conta financeira não encontrada.");
    const acc = accRes.rows[0];

    // 2. Criar Settlement de RECEIPT
    const setRes = await client.query(
      `INSERT INTO financial_settlements (receivable_id, financial_account_id, settlement_type, amount, settlement_date, notes)
       VALUES ($1, $2, 'RECEIPT', $3, $4, $5) RETURNING id`,
      [rec.id, acc.id, settleAmount, data.settlementDate, data.notes?.trim() || null]
    );
    const settlementId = setRes.rows[0].id;

    // 3. Atualizar saldo e status do título a receber
    const newPaid = Number((Number(rec.paid_amount) + settleAmount).toFixed(2));
    const newBal = Number((Number(rec.original_amount) - newPaid).toFixed(2));
    const newStatus = computeStatus(formatDate(rec.due_date) || "", Number(rec.original_amount), newPaid, false);

    await client.query(
      `UPDATE receivables
       SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newPaid, newBal, newStatus, rec.id]
    );

    // 4. Atualizar saldo da conta financeira e registrar no extrato
    const newAccBal = Number((Number(acc.current_balance) + settleAmount).toFixed(2));
    await client.query(
      `UPDATE financial_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newAccBal, acc.id]
    );

    const seqRes = await client.query<{ next_val: string }>("SELECT nextval('statement_number_seq') AS next_val");
    const stmtNum = `EXT-${String(seqRes.rows[0].next_val).padStart(6, "0")}`;

    await client.query(
      `INSERT INTO financial_statements (account_id, statement_number, movement_type, amount, balance_after, movement_date, description, settlement_id)
       VALUES ($1, $2, 'INFLOW', $3, $4, $5, $6, $7)`,
      [acc.id, stmtNum, settleAmount, newAccBal, data.settlementDate, `Recebimento ${rec.receivable_number}: ${rec.description}`, settlementId]
    );

    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('financial_settlements', $1, 'INSERT', $2)`,
      [settlementId, JSON.stringify({ receivableId: rec.id, amount: settleAmount, accountId: acc.id })]
    );
  });

  const updated = await getReceivableById(data.receivableId);
  return updated!;
}

export async function settlePayable(data: {
  payableId: string;
  financialAccountId: string;
  amount: number;
  settlementDate: string; // YYYY-MM-DD
  notes?: string;
}): Promise<PayableRecord> {
  const settleAmount = Number(Number(data.amount).toFixed(2));
  if (settleAmount <= 0) throw new Error("Valor do pagamento deve ser maior que zero.");

  await withTransaction(async (client) => {
    const payRes = await client.query("SELECT * FROM payables WHERE id = $1 FOR UPDATE", [data.payableId]);
    if (payRes.rowCount === 0) throw new Error("Título a pagar não encontrado.");
    const pay = payRes.rows[0];

    if (pay.status === "CANCELED") throw new Error("Não é possível liquidar um título cancelado.");
    if (pay.status === "PAID") throw new Error("Este título já se encontra totalmente liquidado.");

    const curBalance = Number(pay.balance_amount);
    if (settleAmount > curBalance) {
      throw new Error(`Valor informado (R$ ${settleAmount.toFixed(2)}) excede o saldo restante em aberto (R$ ${curBalance.toFixed(2)}).`);
    }

    const accRes = await client.query("SELECT * FROM financial_accounts WHERE id = $1 FOR UPDATE", [data.financialAccountId]);
    if (accRes.rowCount === 0) throw new Error("Conta financeira não encontrada.");
    const acc = accRes.rows[0];

    const setRes = await client.query(
      `INSERT INTO financial_settlements (payable_id, financial_account_id, settlement_type, amount, settlement_date, notes)
       VALUES ($1, $2, 'PAYMENT', $3, $4, $5) RETURNING id`,
      [pay.id, acc.id, settleAmount, data.settlementDate, data.notes?.trim() || null]
    );
    const settlementId = setRes.rows[0].id;

    const newPaid = Number((Number(pay.paid_amount) + settleAmount).toFixed(2));
    const newBal = Number((Number(pay.original_amount) - newPaid).toFixed(2));
    const newStatus = computeStatus(formatDate(pay.due_date) || "", Number(pay.original_amount), newPaid, false);

    await client.query(
      `UPDATE payables
       SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newPaid, newBal, newStatus, pay.id]
    );

    const newAccBal = Number((Number(acc.current_balance) - settleAmount).toFixed(2));
    await client.query(
      `UPDATE financial_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newAccBal, acc.id]
    );

    const seqRes = await client.query<{ next_val: string }>("SELECT nextval('statement_number_seq') AS next_val");
    const stmtNum = `EXT-${String(seqRes.rows[0].next_val).padStart(6, "0")}`;

    await client.query(
      `INSERT INTO financial_statements (account_id, statement_number, movement_type, amount, balance_after, movement_date, description, settlement_id)
       VALUES ($1, $2, 'OUTFLOW', $3, $4, $5, $6, $7)`,
      [acc.id, stmtNum, settleAmount, newAccBal, data.settlementDate, `Pagamento ${pay.payable_number}: ${pay.description}`, settlementId]
    );

    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('financial_settlements', $1, 'INSERT', $2)`,
      [settlementId, JSON.stringify({ payableId: pay.id, amount: settleAmount, accountId: acc.id })]
    );
  });

  const updated = await getPayableById(data.payableId);
  return updated!;
}

export async function reverseSettlement(settlementId: string, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error("Motivo do estorno é obrigatório.");

  await withTransaction(async (client) => {
    const setRes = await client.query("SELECT * FROM financial_settlements WHERE id = $1 FOR UPDATE", [settlementId]);
    if (setRes.rowCount === 0) throw new Error("Baixa não encontrada.");
    const originalSet = setRes.rows[0];

    if (originalSet.is_reversed) throw new Error("Esta baixa já foi estornada anteriormente.");
    if (originalSet.settlement_type === "REVERSAL") throw new Error("Não é possível estornar uma transação de estorno.");

    const amount = Number(originalSet.amount);
    const accRes = await client.query("SELECT * FROM financial_accounts WHERE id = $1 FOR UPDATE", [originalSet.financial_account_id]);
    const acc = accRes.rows[0];

    // Marcar original como estornado
    await client.query("UPDATE financial_settlements SET is_reversed = true WHERE id = $1", [settlementId]);

    // Criar registro de REVERSAL
    const revDate = new Date().toISOString().slice(0, 10);
    const revSetRes = await client.query(
      `INSERT INTO financial_settlements (
        receivable_id, payable_id, financial_account_id, settlement_type,
        amount, settlement_date, notes, reversed_settlement_id, is_reversed
      ) VALUES ($1, $2, $3, 'REVERSAL', $4, $5, $6, $7, false) RETURNING id`,
      [
        originalSet.receivable_id,
        originalSet.payable_id,
        originalSet.financial_account_id,
        amount,
        revDate,
        `Estorno: ${reason.trim()}`,
        settlementId,
      ]
    );
    const reversalSettlementId = revSetRes.rows[0].id;

    // Reverter no título a receber ou a pagar
    if (originalSet.receivable_id) {
      const recRes = await client.query("SELECT * FROM receivables WHERE id = $1 FOR UPDATE", [originalSet.receivable_id]);
      const rec = recRes.rows[0];
      const newPaid = Number((Number(rec.paid_amount) - amount).toFixed(2));
      const newBal = Number((Number(rec.original_amount) - newPaid).toFixed(2));
      const newStatus = computeStatus(formatDate(rec.due_date) || "", Number(rec.original_amount), newPaid, rec.status === "CANCELED");

      await client.query(
        "UPDATE receivables SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
        [newPaid, newBal, newStatus, rec.id]
      );

      // Na conta de onde entrou dinheiro, agora sai (OUTFLOW)
      const newAccBal = Number((Number(acc.current_balance) - amount).toFixed(2));
      await client.query("UPDATE financial_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [newAccBal, acc.id]);

      const seqRes = await client.query<{ next_val: string }>("SELECT nextval('statement_number_seq') AS next_val");
      const stmtNum = `EXT-${String(seqRes.rows[0].next_val).padStart(6, "0")}`;
      await client.query(
        `INSERT INTO financial_statements (account_id, statement_number, movement_type, amount, balance_after, movement_date, description, settlement_id)
         VALUES ($1, $2, 'OUTFLOW', $3, $4, $5, $6, $7)`,
        [acc.id, stmtNum, amount, newAccBal, revDate, `Estorno de recebimento: ${reason}`, reversalSettlementId]
      );
    } else if (originalSet.payable_id) {
      const payRes = await client.query("SELECT * FROM payables WHERE id = $1 FOR UPDATE", [originalSet.payable_id]);
      const pay = payRes.rows[0];
      const newPaid = Number((Number(pay.paid_amount) - amount).toFixed(2));
      const newBal = Number((Number(pay.original_amount) - newPaid).toFixed(2));
      const newStatus = computeStatus(formatDate(pay.due_date) || "", Number(pay.original_amount), newPaid, pay.status === "CANCELED");

      await client.query(
        "UPDATE payables SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
        [newPaid, newBal, newStatus, pay.id]
      );

      // Na conta de onde saiu dinheiro, agora reentra (INFLOW)
      const newAccBal = Number((Number(acc.current_balance) + amount).toFixed(2));
      await client.query("UPDATE financial_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [newAccBal, acc.id]);

      const seqRes = await client.query<{ next_val: string }>("SELECT nextval('statement_number_seq') AS next_val");
      const stmtNum = `EXT-${String(seqRes.rows[0].next_val).padStart(6, "0")}`;
      await client.query(
        `INSERT INTO financial_statements (account_id, statement_number, movement_type, amount, balance_after, movement_date, description, settlement_id)
         VALUES ($1, $2, 'INFLOW', $3, $4, $5, $6, $7)`,
        [acc.id, stmtNum, amount, newAccBal, revDate, `Estorno de pagamento: ${reason}`, reversalSettlementId]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('financial_settlements', $1, 'UPDATE', $2)`,
      [settlementId, JSON.stringify({ action: "REVERSAL", reason, reversedBy: reversalSettlementId })]
    );
  });
}

// ==========================================
// 5. MOTOR DE RECORRÊNCIA AUTOMÁTICA
// ==========================================

export async function processContractRecurrence(
  competency: string,
  contractId?: string
): Promise<{ createdCount: number; skippedCount: number }> {
  if (!/^\d{4}-\d{2}$/.test(competency)) {
    throw new Error("Competência deve estar no formato YYYY-MM.");
  }
  const [yearStr, monthStr] = competency.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Buscar contratos ativos (ou o específico se fornecido)
  const contractsSql = contractId
    ? `SELECT c.id, c.client_id, c.contract_number, c.status, c.canceled_at FROM contracts c WHERE c.status = 'ACTIVE' AND c.id = $1`
    : `SELECT c.id, c.client_id, c.contract_number, c.status, c.canceled_at FROM contracts c WHERE c.status = 'ACTIVE'`;
  const contractsParams = contractId ? [contractId] : [];
  const contractsRes = await query(contractsSql, contractsParams);

  let createdCount = 0;
  let skippedCount = 0;

  for (const c of contractsRes.rows) {
    // Buscar a versão vigente para a competência
    const compDate = `${competency}-01`;
    const verRes = await query(
      `SELECT * FROM contract_versions
       WHERE contract_id = $1 AND effective_date <= $2
       ORDER BY effective_date DESC, version_number DESC
       LIMIT 1`,
      [c.id, compDate]
    );

    if (verRes.rowCount === 0) {
      skippedCount++;
      continue;
    }
    const ver = verRes.rows[0];

    // Verificar periodicidade
    if (ver.billing_period === "ONE_TIME") {
      const verStartMonth = formatDate(ver.start_date)?.slice(0, 7);
      if (verStartMonth !== competency) {
        skippedCount++;
        continue;
      }
    } else if (ver.billing_period === "YEARLY") {
      const startMonth = parseInt(formatDate(ver.start_date)?.slice(5, 7) || "1", 10);
      if (month !== startMonth) {
        skippedCount++;
        continue;
      }
    }

    // Verificar se vigência expirou
    if (!ver.is_indefinite && ver.end_date) {
      const endDateStr = formatDate(ver.end_date);
      if (endDateStr && compDate > endDateStr) {
        skippedCount++;
        continue;
      }
    }

    // Chave única de idempotência
    const idempotencyKey = `REC_${c.id}_${competency}`;
    const effectiveDueDate = calculateEffectiveDueDate(ver.due_day, year, month);

    const existsRes = await query("SELECT id FROM receivables WHERE idempotency_key = $1 AND status <> 'CANCELED'", [idempotencyKey]);
    if (existsRes.rowCount && existsRes.rowCount > 0) {
      skippedCount++;
      continue;
    }

    try {
      await createReceivable({
        clientId: c.client_id,
        contractId: c.id,
        contractVersionId: ver.id,
        description: `Mensalidade Contrato ${c.contract_number} (${ver.title})`,
        competency,
        dueDate: effectiveDueDate,
        originalAmount: Number(ver.total_amount),
        idempotencyKey,
      });
      createdCount++;
    } catch {
      skippedCount++;
    }
  }

  return { createdCount, skippedCount };
}

export async function processPayableRecurrence(
  competency: string,
  templateId?: string
): Promise<{ createdCount: number; skippedCount: number }> {
  if (!/^\d{4}-\d{2}$/.test(competency)) {
    throw new Error("Competência deve estar no formato YYYY-MM.");
  }
  const [yearStr, monthStr] = competency.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const templatesSql = templateId
    ? `SELECT * FROM payable_templates WHERE status = 'ACTIVE' AND id = $1`
    : `SELECT * FROM payable_templates WHERE status = 'ACTIVE'`;
  const templatesParams = templateId ? [templateId] : [];
  const templatesRes = await query(templatesSql, templatesParams);
  let createdCount = 0;
  let skippedCount = 0;

  for (const t of templatesRes.rows) {
    const compDate = `${competency}-01`;
    const startDateStr = formatDate(t.start_date) || "";
    if (compDate < startDateStr.slice(0, 7)) {
      skippedCount++;
      continue;
    }

    if (t.billing_period === "YEARLY") {
      const startMonth = parseInt(startDateStr.slice(5, 7) || "1", 10);
      if (month !== startMonth) {
        skippedCount++;
        continue;
      }
    }

    if (!t.is_indefinite && t.end_date) {
      const endDateStr = formatDate(t.end_date);
      if (endDateStr && compDate > endDateStr) {
        skippedCount++;
        continue;
      }
    }

    const idempotencyKey = `PAG_${t.id}_${competency}`;
    const effectiveDueDate = calculateEffectiveDueDate(t.due_day, year, month);

    const existsRes = await query("SELECT id FROM payables WHERE idempotency_key = $1 AND status <> 'CANCELED'", [idempotencyKey]);
    if (existsRes.rowCount && existsRes.rowCount > 0) {
      skippedCount++;
      continue;
    }

    try {
      await createPayable({
        payableTemplateId: t.id,
        supplierName: t.supplier_name,
        categoryId: t.category_id,
        description: `${t.description} (Recorrência)`,
        competency,
        dueDate: effectiveDueDate,
        originalAmount: Number(t.amount),
        idempotencyKey,
      });
      createdCount++;
    } catch {
      skippedCount++;
    }
  }

  return { createdCount, skippedCount };
}

// ==========================================
// 6. RELATÓRIO DE FLUXO DE CAIXA E RENTABILIDADE
// ==========================================

export async function getCashflowReport(params: {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  accountId?: string;
}): Promise<{ items: CashflowReportItem[]; totalRealizedInflow: number; totalRealizedOutflow: number; totalProjectedInflow: number; totalProjectedOutflow: number }> {
  // 1. Realizado (Extratos com datas efetivas)
  const conds: string[] = ["s.movement_date >= $1", "s.movement_date <= $2"];
  const qParams: unknown[] = [params.startDate, params.endDate];
  if (params.accountId) {
    conds.push(`s.account_id = $${qParams.length + 1}`);
    qParams.push(params.accountId);
  }

  const stmtSql = `
    SELECT movement_date, movement_type, amount
    FROM financial_statements s
    WHERE ${conds.join(" AND ")}
    ORDER BY movement_date ASC
  `;
  const stmtRes = await query(stmtSql, qParams);

  // 2. Previsto em Aberto (Títulos com vencimento no período)
  const recSql = `
    SELECT due_date, balance_amount
    FROM receivables
    WHERE due_date >= $1 AND due_date <= $2 AND status NOT IN ('PAID', 'CANCELED')
  `;
  const recRes = await query(recSql, [params.startDate, params.endDate]);

  const paySql = `
    SELECT due_date, balance_amount
    FROM payables
    WHERE due_date >= $1 AND due_date <= $2 AND status NOT IN ('PAID', 'CANCELED')
  `;
  const payRes = await query(paySql, [params.startDate, params.endDate]);

  // Consolidar por data
  const mapByDate = new Map<string, { rIn: number; rOut: number; pIn: number; pOut: number }>();

  for (const row of stmtRes.rows) {
    const d = formatDate(row.movement_date)!;
    const entry = mapByDate.get(d) || { rIn: 0, rOut: 0, pIn: 0, pOut: 0 };
    if (row.movement_type === "INFLOW") entry.rIn += Number(row.amount);
    if (row.movement_type === "OUTFLOW") entry.rOut += Number(row.amount);
    mapByDate.set(d, entry);
  }

  for (const row of recRes.rows) {
    const d = formatDate(row.due_date)!;
    const entry = mapByDate.get(d) || { rIn: 0, rOut: 0, pIn: 0, pOut: 0 };
    entry.pIn += Number(row.balance_amount);
    mapByDate.set(d, entry);
  }

  for (const row of payRes.rows) {
    const d = formatDate(row.due_date)!;
    const entry = mapByDate.get(d) || { rIn: 0, rOut: 0, pIn: 0, pOut: 0 };
    entry.pOut += Number(row.balance_amount);
    mapByDate.set(d, entry);
  }

  let totalRealizedInflow = 0;
  let totalRealizedOutflow = 0;
  let totalProjectedInflow = 0;
  let totalProjectedOutflow = 0;
  let accumulated = 0;

  const dates = Array.from(mapByDate.keys()).sort();
  const items: CashflowReportItem[] = dates.map((d) => {
    const v = mapByDate.get(d)!;
    const rNet = v.rIn - v.rOut;
    const pNet = v.pIn - v.pOut;
    totalRealizedInflow += v.rIn;
    totalRealizedOutflow += v.rOut;
    totalProjectedInflow += v.pIn;
    totalProjectedOutflow += v.pOut;
    accumulated += rNet;

    return {
      period: d,
      realizedInflow: Number(v.rIn.toFixed(2)),
      realizedOutflow: Number(v.rOut.toFixed(2)),
      realizedNet: Number(rNet.toFixed(2)),
      projectedInflow: Number(v.pIn.toFixed(2)),
      projectedOutflow: Number(v.pOut.toFixed(2)),
      projectedNet: Number(pNet.toFixed(2)),
      accumulatedBalance: Number(accumulated.toFixed(2)),
    };
  });

  return {
    items,
    totalRealizedInflow: Number(totalRealizedInflow.toFixed(2)),
    totalRealizedOutflow: Number(totalRealizedOutflow.toFixed(2)),
    totalProjectedInflow: Number(totalProjectedInflow.toFixed(2)),
    totalProjectedOutflow: Number(totalProjectedOutflow.toFixed(2)),
  };
}

export async function getProfitabilityReport(): Promise<ProfitabilityReportItem[]> {
  // Consolida receita dos itens contratados ativos com os custos unitários específicos
  const sql = `
    SELECT 
      ci.service_id,
      ci.service_name,
      COALESCE(sc.name, 'Sem Categoria') as category_name,
      SUM(ci.total_price) as total_revenue,
      SUM(ci.unit_cost * ci.quantity) as total_cost
    FROM contract_items ci
    JOIN contract_versions cv ON cv.id = ci.contract_version_id
    JOIN contracts c ON c.id = cv.contract_id
    LEFT JOIN services s ON s.id = ci.service_id
    LEFT JOIN service_categories sc ON sc.id = s.category_id
    WHERE c.status = 'ACTIVE'
    GROUP BY ci.service_id, ci.service_name, sc.name
    ORDER BY total_revenue DESC
  `;
  const res = await query(sql);

  return res.rows.map((r) => {
    const rev = Number(r.total_revenue || 0);
    const cost = Number(r.total_cost || 0);
    const margin = rev - cost;
    const pct = rev > 0 ? (margin / rev) * 100 : 0;
    return {
      serviceId: r.service_id,
      serviceName: r.service_name,
      categoryName: r.category_name,
      assignedRevenue: Number(rev.toFixed(2)),
      allocatedDirectCost: Number(cost.toFixed(2)),
      grossMargin: Number(margin.toFixed(2)),
      marginPercentage: Number(pct.toFixed(1)),
    };
  });
}

// Helpers de Mapeamento
function mapReceivableRow(r: Record<string, unknown>): ReceivableRecord {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    clientName: r.client_name ? String(r.client_name) : undefined,
    clientDocument: r.client_document ? String(r.client_document) : null,
    contractId: r.contract_id ? String(r.contract_id) : null,
    contractNumber: r.contract_number ? String(r.contract_number) : null,
    contractVersionId: r.contract_version_id ? String(r.contract_version_id) : null,
    receivableNumber: String(r.receivable_number),
    description: String(r.description),
    competency: String(r.competency),
    dueDate: formatDate(r.due_date as string | Date) || "",
    originalAmount: Number(r.original_amount),
    paidAmount: Number(r.paid_amount),
    balanceAmount: Number(r.balance_amount),
    status: r.status as FinancialStatus,
    idempotencyKey: r.idempotency_key ? String(r.idempotency_key) : null,
    cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : null,
    canceledAt: r.canceled_at instanceof Date ? r.canceled_at.toISOString() : (r.canceled_at ? String(r.canceled_at) : null),
    notes: r.notes ? String(r.notes) : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}

function mapPayableRow(r: Record<string, unknown>): PayableRecord {
  return {
    id: String(r.id),
    payableTemplateId: r.payable_template_id ? String(r.payable_template_id) : null,
    supplierId: r.supplier_id ? String(r.supplier_id) : null,
    supplierName: String(r.supplier_name),
    supplierNameSnapshot: r.supplier_name_snapshot ? String(r.supplier_name_snapshot) : null,
    categoryId: r.category_id ? String(r.category_id) : null,
    categoryName: r.category_name ? String(r.category_name) : undefined,
    contractId: r.contract_id ? String(r.contract_id) : null,
    serviceId: r.service_id ? String(r.service_id) : null,
    serviceName: r.service_name ? String(r.service_name) : undefined,
    payableNumber: String(r.payable_number),
    description: String(r.description),
    competency: String(r.competency),
    dueDate: formatDate(r.due_date as string | Date) || "",
    originalAmount: Number(r.original_amount),
    paidAmount: Number(r.paid_amount),
    balanceAmount: Number(r.balance_amount),
    allocatedAmount: Number(r.allocated_amount || 0),
    unallocatedAmount: Number(r.unallocated_amount || 0),
    status: r.status as FinancialStatus,
    idempotencyKey: r.idempotency_key ? String(r.idempotency_key) : null,
    cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : null,
    canceledAt: r.canceled_at instanceof Date ? r.canceled_at.toISOString() : (r.canceled_at ? String(r.canceled_at) : null),
    notes: r.notes ? String(r.notes) : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}
