import { getDbPool } from "@/lib/db/pool";
import { normalizeDocument } from "@/shared/cpf-cnpj";
import {
  CreateSupplierInput,
  CreateSupplierSchema,
  UpdateSupplierInput,
  UpdateSupplierSchema,
  SupplierRecord,
  CreateAllocationInput,
  CreateAllocationSchema,
  PayableAllocationRecord,
  CostAccrualRecord,
  SupplierExpenseSummary,
  SupplierPayableItem,
  SupplierContractedServiceItem,
  ManagerialProfitabilityItem,
} from "./types";

interface AuditContext {
  userId?: string;
  userEmail?: string;
}

export class SupplierService {
  /**
   * Lista fornecedores com suporte a busca textual, categoria e status
   */
  static async listSuppliers(params?: {
    search?: string;
    category?: string;
    status?: "ACTIVE" | "ARCHIVED" | "ALL";
    limit?: number;
    offset?: number;
  }): Promise<{ suppliers: SupplierRecord[]; total: number }> {
    const pool = getDbPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.status && params.status !== "ALL") {
      conditions.push(`s.status = $${idx++}`);
      values.push(params.status);
    } else if (!params?.status) {
      conditions.push(`s.status = 'ACTIVE'`);
    }

    if (params?.category) {
      conditions.push(`s.category = $${idx++}`);
      values.push(params.category);
    }

    if (params?.search) {
      const cleanDoc = normalizeDocument(params.search);
      conditions.push(
        `(s.name ILIKE $${idx} OR s.trade_name ILIKE $${idx} OR s.supplier_code ILIKE $${idx} OR s.document ILIKE $${idx + 1})`
      );
      values.push(`%${params.search}%`, `%${cleanDoc || params.search}%`);
      idx += 2;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const countQuery = `SELECT COUNT(*) as total FROM suppliers s ${whereClause};`;
    const { rows: countRows } = await pool.query(countQuery, values);
    const total = parseInt(countRows[0]?.total || "0", 10);

    const query = `
      SELECT 
        s.id,
        s.supplier_code as "supplierCode",
        s.person_type as "personType",
        s.name,
        s.trade_name as "tradeName",
        s.document,
        s.email,
        s.phone,
        s.whatsapp,
        s.category,
        s.postal_code as "postalCode",
        s.street,
        s.number,
        s.complement,
        s.neighborhood,
        s.city,
        s.state,
        s.notes,
        s.status,
        s.archived_at as "archivedAt",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        COALESCE((
          SELECT SUM(pa.allocated_amount) 
          FROM payable_allocations pa
          JOIN payables p ON p.id = pa.payable_id
          WHERE p.supplier_id = s.id AND pa.status = 'ACTIVE'
        ), 0.00)::float as "totalAllocatedExpenses",
        COALESCE((
          SELECT COUNT(*) 
          FROM payables p 
          WHERE p.supplier_id = s.id AND p.status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID')
        ), 0)::int as "openPayablesCount"
      FROM suppliers s
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    const { rows } = await pool.query(query, [...values, limit, offset]);
    return { suppliers: rows, total };
  }

  /**
   * Obtém detalhes de um fornecedor por ID
   */
  static async getSupplierById(id: string): Promise<SupplierRecord | null> {
    const pool = getDbPool();
    const query = `
      SELECT 
        s.id,
        s.supplier_code as "supplierCode",
        s.person_type as "personType",
        s.name,
        s.trade_name as "tradeName",
        s.document,
        s.email,
        s.phone,
        s.whatsapp,
        s.category,
        s.postal_code as "postalCode",
        s.street,
        s.number,
        s.complement,
        s.neighborhood,
        s.city,
        s.state,
        s.notes,
        s.status,
        s.archived_at as "archivedAt",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        COALESCE((
          SELECT SUM(pa.allocated_amount) 
          FROM payable_allocations pa
          JOIN payables p ON p.id = pa.payable_id
          WHERE p.supplier_id = s.id AND pa.status = 'ACTIVE'
        ), 0.00)::float as "totalAllocatedExpenses",
        COALESCE((
          SELECT COUNT(*) 
          FROM payables p 
          WHERE p.supplier_id = s.id AND p.status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID')
        ), 0)::int as "openPayablesCount"
      FROM suppliers s
      WHERE s.id = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Cadastra novo fornecedor (PF ou PJ)
   */
  static async createSupplier(
    rawInput: CreateSupplierInput,
    context?: AuditContext
  ): Promise<SupplierRecord> {
    const input = CreateSupplierSchema.parse(rawInput);
    const pool = getDbPool();
    const cleanDoc = input.document ? normalizeDocument(input.document) : null;

    if (cleanDoc) {
      const checkDoc = await pool.query(
        `SELECT id, name FROM suppliers WHERE document = $1 AND status <> 'ARCHIVED' LIMIT 1;`,
        [cleanDoc]
      );
      if (checkDoc.rows.length > 0) {
        throw new Error(
          `Já existe um fornecedor ativo cadastrado com o documento informado (${checkDoc.rows[0].name}).`
        );
      }
    }

    const query = `
      INSERT INTO suppliers (
        person_type, name, trade_name, document, email, phone, whatsapp,
        category, postal_code, street, number, complement, neighborhood, city, state, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING 
        id, supplier_code as "supplierCode", person_type as "personType", name,
        trade_name as "tradeName", document, email, phone, whatsapp, category,
        postal_code as "postalCode", street, number, complement, neighborhood,
        city, state, notes, status, created_at as "createdAt", updated_at as "updatedAt";
    `;

    const { rows } = await pool.query(query, [
      input.personType,
      input.name.trim(),
      input.tradeName?.trim() || null,
      cleanDoc,
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.whatsapp?.trim() || null,
      input.category?.trim() || null,
      input.postalCode?.trim() || null,
      input.street?.trim() || null,
      input.number?.trim() || null,
      input.complement?.trim() || null,
      input.neighborhood?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.notes?.trim() || null,
    ]);

    const created = rows[0];

    // Log de auditoria
    await pool.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('suppliers', $1, 'INSERT', $2::jsonb);`,
      [created.id, JSON.stringify({ name: created.name, code: created.supplierCode })]
    );

    return created;
  }

  /**
   * Atualiza cadastro de fornecedor
   */
  static async updateSupplier(
    id: string,
    rawInput: UpdateSupplierInput,
    context?: AuditContext
  ): Promise<SupplierRecord> {
    const input = UpdateSupplierSchema.parse(rawInput);
    const pool = getDbPool();

    const existing = await this.getSupplierById(id);
    if (!existing) {
      throw new Error(`Fornecedor ${id} não encontrado.`);
    }

    const cleanDoc = input.document !== undefined 
      ? (input.document ? normalizeDocument(input.document) : null)
      : existing.document;

    if (cleanDoc && cleanDoc !== existing.document) {
      const checkDoc = await pool.query(
        `SELECT id, name FROM suppliers WHERE document = $1 AND id <> $2 AND status <> 'ARCHIVED' LIMIT 1;`,
        [cleanDoc, id]
      );
      if (checkDoc.rows.length > 0) {
        throw new Error(`O documento informado já está em uso pelo fornecedor ${checkDoc.rows[0].name}.`);
      }
    }

    const query = `
      UPDATE suppliers SET
        person_type = COALESCE($1, person_type),
        name = COALESCE($2, name),
        trade_name = COALESCE($3, trade_name),
        document = $4,
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        whatsapp = COALESCE($7, whatsapp),
        category = COALESCE($8, category),
        postal_code = COALESCE($9, postal_code),
        street = COALESCE($10, street),
        number = COALESCE($11, number),
        complement = COALESCE($12, complement),
        neighborhood = COALESCE($13, neighborhood),
        city = COALESCE($14, city),
        state = COALESCE($15, state),
        notes = COALESCE($16, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING 
        id, supplier_code as "supplierCode", person_type as "personType", name,
        trade_name as "tradeName", document, email, phone, whatsapp, category,
        postal_code as "postalCode", street, number, complement, neighborhood,
        city, state, notes, status, archived_at as "archivedAt",
        created_at as "createdAt", updated_at as "updatedAt";
    `;

    const { rows } = await pool.query(query, [
      input.personType || null,
      input.name?.trim() || null,
      input.tradeName !== undefined ? (input.tradeName?.trim() || null) : null,
      cleanDoc,
      input.email !== undefined ? (input.email?.trim() || null) : null,
      input.phone !== undefined ? (input.phone?.trim() || null) : null,
      input.whatsapp !== undefined ? (input.whatsapp?.trim() || null) : null,
      input.category !== undefined ? (input.category?.trim() || null) : null,
      input.postalCode !== undefined ? (input.postalCode?.trim() || null) : null,
      input.street !== undefined ? (input.street?.trim() || null) : null,
      input.number !== undefined ? (input.number?.trim() || null) : null,
      input.complement !== undefined ? (input.complement?.trim() || null) : null,
      input.neighborhood !== undefined ? (input.neighborhood?.trim() || null) : null,
      input.city !== undefined ? (input.city?.trim() || null) : null,
      input.state !== undefined ? (input.state?.trim() || null) : null,
      input.notes !== undefined ? (input.notes?.trim() || null) : null,
      id,
    ]);

    await pool.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('suppliers', $1, 'UPDATE', $2::jsonb);`,
      [id, JSON.stringify(input)]
    );

    return rows[0];
  }

  /**
   * Arquiva fornecedor (Soft Delete seguro, sem exclusão física)
   */
  static async archiveSupplier(id: string, context?: AuditContext): Promise<SupplierRecord> {
    const pool = getDbPool();
    const query = `
      UPDATE suppliers 
      SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'ACTIVE'
      RETURNING id, supplier_code as "supplierCode", name, status, archived_at as "archivedAt";
    `;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      throw new Error(`Fornecedor ${id} não encontrado ou já está arquivado.`);
    }

    await pool.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('suppliers', $1, 'UPDATE', $2::jsonb);`,
      [id, JSON.stringify({ archivedAt: rows[0].archivedAt })]
    );

    return rows[0];
  }

  /**
   * Reativa fornecedor arquivado
   */
  static async reactivateSupplier(id: string, context?: AuditContext): Promise<SupplierRecord> {
    const pool = getDbPool();
    const query = `
      UPDATE suppliers 
      SET status = 'ACTIVE', archived_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'ARCHIVED'
      RETURNING id, supplier_code as "supplierCode", name, status;
    `;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      throw new Error(`Fornecedor ${id} não encontrado ou já está ativo.`);
    }

    await pool.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('suppliers', $1, 'UPDATE', $2::jsonb);`,
      [id, JSON.stringify({ status: "ACTIVE" })]
    );

    return rows[0];
  }

  /**
   * Realiza rateio transacional de um título a pagar para contratos/serviços
   * Garante trava de concorrência (SELECT ... FOR UPDATE), limite exato de alocação
   * e divisão em centavos para apropriação gerencial sem perda residual.
   */
  static async allocatePayable(
    rawInput: CreateAllocationInput,
    context?: AuditContext
  ): Promise<PayableAllocationRecord> {
    const input = CreateAllocationSchema.parse(rawInput);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN;");

      // 1. Trava transacional no título a pagar
      const payableRes = await client.query(
        `SELECT id, original_amount, allocated_amount, unallocated_amount, status, supplier_id, description
         FROM payables 
         WHERE id = $1 
         FOR UPDATE;`,
        [input.payableId]
      );

      if (payableRes.rows.length === 0) {
        throw new Error(`Título a pagar ${input.payableId} não encontrado.`);
      }

      const payable = payableRes.rows[0];
      if (payable.status === "CANCELED") {
        throw new Error("Não é permitido alocar despesas em títulos cancelados.");
      }

      const originalCents = Math.round(Number(payable.original_amount) * 100);
      const currentAllocatedCents = Math.round(Number(payable.allocated_amount) * 100);
      const incomingAllocatedCents = Math.round(input.allocatedAmount * 100);

      const newAllocatedCents = currentAllocatedCents + incomingAllocatedCents;
      if (newAllocatedCents > originalCents) {
        const availableAmount = (originalCents - currentAllocatedCents) / 100;
        throw new Error(
          `Valor de rateio (R$ ${input.allocatedAmount.toFixed(2)}) ultrapassa o saldo disponível do título (R$ ${availableAmount.toFixed(2)}). Original: R$ ${Number(payable.original_amount).toFixed(2)}, Já alocado: R$ ${(currentAllocatedCents / 100).toFixed(2)}.`
        );
      }

      const newAllocatedAmount = newAllocatedCents / 100;
      const newUnallocatedAmount = (originalCents - newAllocatedCents) / 100;

      // 2. Atualizar o título a pagar
      await client.query(
        `UPDATE payables 
         SET allocated_amount = $1, unallocated_amount = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3;`,
        [newAllocatedAmount, newUnallocatedAmount, input.payableId]
      );

      // 3. Inserir o registro de rateio
      const insertAllocQuery = `
        INSERT INTO payable_allocations (
          payable_id, contract_id, contract_item_id, service_id,
          allocated_amount, coverage_start_date, coverage_end_date,
          cost_periodicity, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
          id, payable_id as "payableId", contract_id as "contractId",
          contract_item_id as "contractItemId", service_id as "serviceId",
          allocated_amount::float as "allocatedAmount",
          coverage_start_date::text as "coverageStartDate",
          coverage_end_date::text as "coverageEndDate",
          cost_periodicity as "costPeriodicity",
          status, notes, created_at as "createdAt", updated_at as "updatedAt";
      `;

      const allocRes = await client.query(insertAllocQuery, [
        input.payableId,
        input.contractId || null,
        input.contractItemId || null,
        input.serviceId || null,
        input.allocatedAmount,
        input.coverageStartDate,
        input.coverageEndDate,
        input.costPeriodicity,
        input.notes || null,
      ]);

      const allocation: PayableAllocationRecord = allocRes.rows[0];

      // 4. Calcular e inserir apropriações por competência (Cost Accruals)
      // Determina os meses no intervalo [coverageStartDate, coverageEndDate]
      const months = generateMonthInterval(input.coverageStartDate, input.coverageEndDate);
      const monthsCount = months.length;

      if (monthsCount === 0) {
        throw new Error("Intervalo de cobertura inválido: nenhum mês compreendido.");
      }

      // Distribuição estrita de centavos: base para cada mês + resto no último mês
      const baseCents = Math.floor(incomingAllocatedCents / monthsCount);
      const remainderCents = incomingAllocatedCents - baseCents * monthsCount;

      const accruals: CostAccrualRecord[] = [];

      for (let i = 0; i < monthsCount; i++) {
        const monthKey = months[i];
        // O último mês absorve os centavos de arredondamento residual
        const monthCents = i === monthsCount - 1 ? baseCents + remainderCents : baseCents;
        const monthAmount = monthCents / 100;

        const accrualRes = await client.query(
          `INSERT INTO cost_accruals (
            allocation_id, payable_id, contract_id, service_id, supplier_id,
            competency_month, accrual_amount, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACCRUED')
          RETURNING 
            id, allocation_id as "allocationId", payable_id as "payableId",
            contract_id as "contractId", service_id as "serviceId",
            supplier_id as "supplierId", competency_month as "competencyMonth",
            accrual_amount::float as "accrualAmount", status, created_at as "createdAt";`,
          [
            allocation.id,
            input.payableId,
            input.contractId || null,
            input.serviceId || null,
            payable.supplier_id || null,
            monthKey,
            monthAmount,
          ]
        );

        accruals.push(accrualRes.rows[0]);
      }

      allocation.accruals = accruals;

      // Auditoria
      await client.query(
        `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
         VALUES ('payable_allocations', $1, 'INSERT', $2::jsonb);`,
        [
          allocation.id,
          JSON.stringify({
            payableId: input.payableId,
            amount: input.allocatedAmount,
            monthsCount,
          }),
        ]
      );

      await client.query("COMMIT;");
      return allocation;
    } catch (err) {
      await client.query("ROLLBACK;");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cancela rateio financeiro com reversão auditada (SEM ON DELETE CASCADE)
   * Restaura integralmente o saldo não alocado do título.
   */
  static async cancelAllocation(
    allocationId: string,
    reason: string,
    context?: AuditContext
  ): Promise<PayableAllocationRecord> {
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN;");

      // 1. Trava do rateio
      const allocRes = await client.query(
        `SELECT id, payable_id, allocated_amount, status 
         FROM payable_allocations 
         WHERE id = $1 
         FOR UPDATE;`,
        [allocationId]
      );

      if (allocRes.rows.length === 0) {
        throw new Error(`Rateio ${allocationId} não encontrado.`);
      }

      const allocation = allocRes.rows[0];
      if (allocation.status === "CANCELED") {
        throw new Error("Este rateio já foi cancelado anteriormente.");
      }

      // 2. Trava do título
      const payableRes = await client.query(
        `SELECT id, original_amount, allocated_amount, unallocated_amount 
         FROM payables 
         WHERE id = $1 
         FOR UPDATE;`,
        [allocation.payable_id]
      );

      const payable = payableRes.rows[0];
      const origCents = Math.round(Number(payable.original_amount) * 100);
      const currAllocCents = Math.round(Number(payable.allocated_amount) * 100);
      const cancelCents = Math.round(Number(allocation.allocated_amount) * 100);

      const newAllocCents = Math.max(0, currAllocCents - cancelCents);
      const newUnallocCents = origCents - newAllocCents;

      // 3. Atualizar título e rateio (SEM DELETE!)
      await client.query(
        `UPDATE payables 
         SET allocated_amount = $1, unallocated_amount = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3;`,
        [newAllocCents / 100, newUnallocCents / 100, allocation.payable_id]
      );

      await client.query(
        `UPDATE payable_allocations 
         SET status = 'CANCELED', cancellation_reason = $1, canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [reason, allocationId]
      );

      // 4. Cancelar apropriações por competência associadas
      await client.query(
        `UPDATE cost_accruals 
         SET status = 'CANCELED' 
         WHERE allocation_id = $1 AND status = 'ACCRUED';`,
        [allocationId]
      );

      // Auditoria
      await client.query(
        `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
         VALUES ('payable_allocations', $1, 'REVERSAL', $2::jsonb);`,
        [
          allocationId,
          JSON.stringify({ reason, restoredAmount: allocation.allocated_amount }),
        ]
      );

      await client.query("COMMIT;");

      const { rows } = await pool.query(
        `SELECT 
          id, payable_id as "payableId", contract_id as "contractId",
          contract_item_id as "contractItemId", service_id as "serviceId",
          allocated_amount::float as "allocatedAmount",
          coverage_start_date::text as "coverageStartDate",
          coverage_end_date::text as "coverageEndDate",
          cost_periodicity as "costPeriodicity",
          status, cancellation_reason as "cancellationReason",
          canceled_at as "canceledAt", notes, created_at as "createdAt"
         FROM payable_allocations WHERE id = $1;`,
        [allocationId]
      );

      return rows[0];
    } catch (err) {
      await client.query("ROLLBACK;");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Relatório 1: Gastos Consolidados por Fornecedor
   */
  static async getSupplierExpenseReport(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<SupplierExpenseSummary[]> {
    const pool = getDbPool();
    const query = `
      SELECT 
        s.id as "supplierId",
        s.supplier_code as "supplierCode",
        s.name as "supplierName",
        COALESCE(s.category, 'Não categorizado') as "category",
        COALESCE(SUM(p.original_amount), 0.00)::float as "totalOriginalPayables",
        COALESCE(SUM(p.paid_amount), 0.00)::float as "totalPaid",
        COALESCE(SUM(p.balance_amount), 0.00)::float as "totalOpenPayables",
        COALESCE(SUM(p.allocated_amount), 0.00)::float as "totalAllocatedToContracts",
        COUNT(DISTINCT ci.contract_version_id)::int as "activeContractsCount"
      FROM suppliers s
      LEFT JOIN payables p ON p.supplier_id = s.id AND p.status <> 'CANCELED'
      LEFT JOIN contract_items ci ON ci.supplier_id = s.id
      GROUP BY s.id, s.supplier_code, s.name, s.category
      ORDER BY "totalOriginalPayables" DESC, s.name ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Relatório 2: Valores a Pagar por Fornecedor (Obrigações e Rateio)
   */
  static async getSupplierPayableReport(params?: {
    supplierId?: string;
    status?: string;
  }): Promise<SupplierPayableItem[]> {
    const pool = getDbPool();
    const conditions: string[] = ["p.status <> 'CANCELED'"];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.supplierId) {
      conditions.push(`p.supplier_id = $${idx++}`);
      values.push(params.supplierId);
    }
    if (params?.status) {
      conditions.push(`p.status = $${idx++}`);
      values.push(params.status);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const query = `
      SELECT 
        p.id as "payableId",
        p.payable_number as "payableNumber",
        p.supplier_id as "supplierId",
        COALESCE(s.name, p.supplier_name_snapshot, p.supplier_name) as "supplierName",
        p.description,
        p.competency,
        p.due_date::text as "dueDate",
        p.original_amount::float as "originalAmount",
        p.paid_amount::float as "paidAmount",
        p.balance_amount::float as "balanceAmount",
        p.allocated_amount::float as "allocatedAmount",
        p.unallocated_amount::float as "unallocatedAmount",
        p.status
      FROM payables p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      ${where}
      ORDER BY p.due_date ASC;
    `;
    const { rows } = await pool.query(query, values);
    return rows;
  }

  /**
   * Relatório 3: Serviços Contratados por Fornecedor (com suporte a snapshot histórico)
   */
  static async getSupplierContractedServicesReport(
    supplierId: string
  ): Promise<SupplierContractedServiceItem[]> {
    const pool = getDbPool();
    const query = `
      SELECT 
        c.id as "contractId",
        c.contract_number as "contractNumber",
        cl.id as "clientId",
        cl.name as "clientName",
        s.id as "serviceId",
        ci.service_name as "serviceName",
        ci.quantity::float as "quantity",
        ci.unit_cost::float as "unitCost",
        (ci.quantity * ci.unit_cost)::float as "totalCost",
        ci.cost_periodicity as "costPeriodicity",
        ci.is_legacy_cost as "isLegacyCost",
        c.status as "contractStatus"
      FROM contract_items ci
      JOIN contract_versions cv ON cv.id = ci.contract_version_id
      JOIN contracts c ON c.id = cv.contract_id
      JOIN clients cl ON cl.id = c.client_id
      JOIN services s ON s.id = ci.service_id
      WHERE ci.supplier_id = $1
      ORDER BY c.contract_number DESC;
    `;
    const { rows } = await pool.query(query, [supplierId]);
    return rows;
  }

  /**
   * Relatório 4: Rentabilidade Gerencial por Competência
   * Segrega: Receita Contratada, Faturada, Recebida e Reconhecida
   * vs Custos Estimados, Apropriados no Mês e Legados Não Classificados
   */
  static async getManagerialProfitabilityReport(
    competencyMonth: string // YYYY-MM
  ): Promise<ManagerialProfitabilityItem[]> {
    const pool = getDbPool();

    // 1. Receitas reconhecidas e itens de serviço ativos no período
    const query = `
      WITH active_contracts AS (
        SELECT DISTINCT ON (c.id)
          c.id as contract_id,
          c.contract_number,
          c.client_id,
          cl.name as client_name,
          cv.id as version_id,
          cv.billing_period,
          cv.total_amount
        FROM contracts c
        JOIN clients cl ON cl.id = c.client_id
        JOIN contract_versions cv ON cv.contract_id = c.id
        WHERE c.status = 'ACTIVE'
        ORDER BY c.id, cv.version_number DESC
      ),
      service_items AS (
        SELECT 
          ac.contract_id,
          ac.client_id,
          ac.client_name,
          ci.service_id,
          ci.service_name,
          ci.quantity,
          ci.unit_price,
          ci.unit_cost,
          ci.total_price,
          ci.cost_periodicity,
          ci.is_legacy_cost,
          ac.billing_period
        FROM active_contracts ac
        JOIN contract_items ci ON ci.contract_version_id = ac.version_id
      ),
      accruals_month AS (
        SELECT 
          ca.contract_id,
          ca.service_id,
          SUM(ca.accrual_amount) as accrued_cost
        FROM cost_accruals ca
        WHERE ca.competency_month = $1 AND ca.status = 'ACCRUED'
        GROUP BY ca.contract_id, ca.service_id
      ),
      invoiced_month AS (
        SELECT 
          r.contract_id,
          SUM(r.original_amount) as invoiced_amount,
          SUM(r.paid_amount) as received_amount
        FROM receivables r
        WHERE r.competency = $1 AND r.status <> 'CANCELED'
        GROUP BY r.contract_id
      )
      SELECT 
        $1 as "periodMonth",
        si.service_id as "serviceId",
        si.service_name as "serviceName",
        si.client_id as "clientId",
        si.client_name as "clientName",
        -- Receita Contratada proporcional ao mês
        CASE 
          WHEN si.billing_period = 'YEARLY' THEN ROUND((si.total_price / 12.0), 2)::float
          ELSE si.total_price::float
        END as "contractedRevenue",
        -- Receita Faturada (títulos emitidos na competência)
        COALESCE(inv.invoiced_amount, 0.00)::float as "invoicedRevenue",
        -- Receita Recebida (liquidações em dinheiro)
        COALESCE(inv.received_amount, 0.00)::float as "receivedRevenue",
        -- Receita Reconhecida por competência gerencial
        CASE 
          WHEN si.billing_period = 'YEARLY' THEN ROUND((si.total_price / 12.0), 2)::float
          ELSE si.total_price::float
        END as "recognizedRevenue",
        -- Custo Estimado
        CASE 
          WHEN si.cost_periodicity = 'YEARLY' THEN ROUND(((si.unit_cost * si.quantity) / 12.0), 2)::float
          WHEN si.cost_periodicity = 'UNCLASSIFIED' THEN 0.00
          ELSE (si.unit_cost * si.quantity)::float
        END as "estimatedDirectCost",
        -- Custo Apropriado Real (Cost Accruals no mês)
        COALESCE(acc.accrued_cost, 0.00)::float as "accruedRealCost",
        -- Custo Legado não classificado destacado para auditoria
        CASE 
          WHEN si.cost_periodicity = 'UNCLASSIFIED' OR si.is_legacy_cost = true THEN (si.unit_cost * si.quantity)::float
          ELSE 0.00
        END as "unclassifiedLegacyCost"
      FROM service_items si
      LEFT JOIN accruals_month acc ON acc.contract_id = si.contract_id AND acc.service_id = si.service_id
      LEFT JOIN invoiced_month inv ON inv.contract_id = si.contract_id
      ORDER BY "recognizedRevenue" DESC;
    `;

    const { rows } = await pool.query(query, [competencyMonth]);

    return rows.map((r) => {
      const recognized = Number(r.recognizedRevenue) || 0;
      const estimatedCost = Number(r.estimatedDirectCost) || 0;
      const accruedCost = Number(r.accruedRealCost) || 0;

      const estimatedMargin = recognized - estimatedCost;
      const estimatedMarginPct = recognized > 0 ? (estimatedMargin / recognized) * 100 : 0;

      const realizedMargin = recognized - accruedCost;
      const realizedMarginPct = recognized > 0 ? (realizedMargin / recognized) * 100 : 0;

      return {
        ...r,
        estimatedGrossMargin: Math.round(estimatedMargin * 100) / 100,
        estimatedMarginPct: Math.round(estimatedMarginPct * 10) / 10,
        realizedGrossMargin: Math.round(realizedMargin * 100) / 100,
        realizedMarginPct: Math.round(realizedMarginPct * 10) / 10,
      };
    });
  }
}

/**
 * Utilitário para gerar a lista de competências YYYY-MM entre duas datas
 */
function generateMonthInterval(startDateStr: string, endDateStr: string): string[] {
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);

  const months: string[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (current <= endMonth) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, "0");
    months.push(`${yyyy}-${mm}`);
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return months;
}
