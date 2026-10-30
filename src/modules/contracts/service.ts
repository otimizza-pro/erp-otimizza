import { query, withTransaction } from "@/lib/db/pool";
import { calculateEffectiveDueDate, generateBillingPeriodKey } from "@/shared/recurrence";
import {
  ContractRecord,
  ContractVersionRecord,
  ContractItemRecord,
  CreateContractInput,
  CreateContractVersionInput,
  CancelContractInput,
  RecurrenceProjection,
  ContractStatus,
} from "./types";

interface DbContractRow {
  id: string;
  client_id: string;
  contract_number: string;
  status: ContractStatus;
  cancellation_reason: string | null;
  canceled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  client_name?: string;
  client_trade_name?: string | null;
  client_document?: string | null;
}

interface DbContractVersionRow {
  id: string;
  contract_id: string;
  version_number: number;
  title: string;
  description: string | null;
  billing_period: "ONE_TIME" | "MONTHLY" | "YEARLY";
  due_day: number;
  start_date: string | Date;
  end_date: string | Date | null;
  is_indefinite: boolean;
  effective_date: string | Date;
  total_amount: string | number;
  notes: string | null;
  created_at: Date;
}

interface DbContractItemRow {
  id: string;
  contract_version_id: string;
  service_id: string;
  service_name: string;
  combo_id: string | null;
  combo_name: string | null;
  supplier_id?: string | null;
  supplier_name_snapshot?: string | null;
  cost_periodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
  is_legacy_cost?: boolean;
  quantity: string | number;
  unit_price: string | number;
  unit_cost: string | number;
  total_price: string | number;
  created_at: Date;
}

function formatDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function mapItemRow(row: DbContractItemRow): ContractItemRecord {
  return {
    id: row.id,
    contractVersionId: row.contract_version_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    comboId: row.combo_id,
    comboName: row.combo_name,
    supplierId: row.supplier_id || null,
    supplierNameSnapshot: row.supplier_name_snapshot || null,
    costPeriodicity: row.cost_periodicity || "MONTHLY",
    isLegacyCost: Boolean(row.is_legacy_cost),
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    unitCost: Number(row.unit_cost),
    totalPrice: Number(row.total_price),
    createdAt: row.created_at.toISOString(),
  };
}

function mapVersionRow(row: DbContractVersionRow, items: ContractItemRecord[] = []): ContractVersionRecord {
  return {
    id: row.id,
    contractId: row.contract_id,
    versionNumber: row.version_number,
    title: row.title,
    description: row.description,
    billingPeriod: row.billing_period,
    dueDay: row.due_day,
    startDate: formatDate(row.start_date) || "",
    endDate: formatDate(row.end_date),
    isIndefinite: row.is_indefinite,
    effectiveDate: formatDate(row.effective_date) || "",
    totalAmount: Number(row.total_amount),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    items,
  };
}

function mapContractRow(
  row: DbContractRow,
  currentVersion?: ContractVersionRecord,
  versions?: ContractVersionRecord[]
): ContractRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientTradeName: row.client_trade_name,
    clientDocument: row.client_document,
    contractNumber: row.contract_number,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    canceledAt: row.canceled_at ? row.canceled_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    currentVersion,
    versions,
  };
}

/**
 * Cria uma nova contratação independente para um cliente com a primeira versão (v1).
 */
export async function createContract(input: CreateContractInput): Promise<ContractRecord> {
  if (!input.clientId) {
    throw new Error("Cliente é obrigatório para criar uma contratação.");
  }
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Título da contratação é obrigatório.");
  }
  if (!input.items || input.items.length === 0) {
    throw new Error("Uma contratação deve possuir pelo menos um serviço ou componente.");
  }
  if (input.dueDay < 1 || input.dueDay > 31) {
    throw new Error("Dia de vencimento deve estar entre 1 e 31.");
  }
  if (!input.startDate) {
    throw new Error("Data de início é obrigatória.");
  }
  if (!input.isIndefinite && !input.endDate) {
    throw new Error("Informe a data de término ou marque como vigência indeterminada.");
  }

  return await withTransaction(async (client) => {
    // 1. Gerar número de contrato sequencial formatado CTR-00001
    const seqRes = await client.query<{ next_val: string }>(
      "SELECT nextval('contract_number_seq') AS next_val"
    );
    const seqNum = seqRes.rows[0].next_val;
    const contractNumber = `CTR-${String(seqNum).padStart(5, "0")}`;

    // 2. Inserir cabeçalho do contrato
    const contractStatus = input.status || "ACTIVE";
    const insertContractSql = `
      INSERT INTO contracts (client_id, contract_number, status)
      VALUES ($1, $2, $3)
      RETURNING id, client_id, contract_number, status, cancellation_reason, canceled_at, created_at, updated_at
    `;
    const contractRes = await client.query<DbContractRow>(insertContractSql, [
      input.clientId,
      contractNumber,
      contractStatus,
    ]);
    const contractDb = contractRes.rows[0];

    // 3. Buscar nomes dos serviços e fornecedores para o snapshot imutável
    const serviceIds = input.items.map((it) => it.serviceId);
    const servicesRes = await client.query<{
      id: string;
      name: string;
      default_supplier_id?: string | null;
      default_cost_periodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
    }>(
      `SELECT id, name, default_supplier_id, default_cost_periodicity FROM services WHERE id = ANY($1::uuid[])`,
      [serviceIds]
    );
    const serviceMap = new Map<string, {
      name: string;
      defaultSupplierId?: string | null;
      defaultCostPeriodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
    }>();
    servicesRes.rows.forEach((s) => serviceMap.set(s.id, {
      name: s.name,
      defaultSupplierId: s.default_supplier_id,
      defaultCostPeriodicity: s.default_cost_periodicity,
    }));

    const supplierIds = input.items
      .map((it) => it.supplierId || serviceMap.get(it.serviceId)?.defaultSupplierId)
      .filter((id): id is string => Boolean(id));
    const supplierNameMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const supRes = await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM suppliers WHERE id = ANY($1::uuid[])`,
        [supplierIds]
      );
      supRes.rows.forEach((sp) => supplierNameMap.set(sp.id, sp.name));
    }

    // 4. Calcular valor total dos itens com precisão
    let totalVersionAmount = 0;
    const computedItems = input.items.map((item) => {
      const qty = item.quantity > 0 ? item.quantity : 1;
      const uPrice = Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : 0;
      const uCost = Number(item.unitCost) >= 0 ? Number(item.unitCost) : 0;
      const itemTotal = Number((qty * uPrice).toFixed(2));
      totalVersionAmount = Number((totalVersionAmount + itemTotal).toFixed(2));

      const sInfo = serviceMap.get(item.serviceId);
      const serviceName = item.serviceName || sInfo?.name || "Serviço";
      const supplierId = item.supplierId || sInfo?.defaultSupplierId || null;
      const supplierNameSnapshot = item.supplierNameSnapshot || (supplierId ? supplierNameMap.get(supplierId) : null) || null;
      const costPeriodicity = item.costPeriodicity || sInfo?.defaultCostPeriodicity || "MONTHLY";

      return {
        ...item,
        quantity: qty,
        unitPrice: uPrice,
        unitCost: uCost,
        totalPrice: itemTotal,
        serviceName,
        supplierId,
        supplierNameSnapshot,
        costPeriodicity,
      };
    });

    // 5. Inserir versão 1
    const insertVersionSql = `
      INSERT INTO contract_versions (
        contract_id, version_number, title, description, billing_period,
        due_day, start_date, end_date, is_indefinite, effective_date,
        total_amount, notes
      ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const versionRes = await client.query<DbContractVersionRow>(insertVersionSql, [
      contractDb.id,
      input.title.trim(),
      input.description?.trim() || null,
      input.billingPeriod,
      input.dueDay,
      input.startDate,
      input.isIndefinite ? null : input.endDate,
      Boolean(input.isIndefinite),
      input.startDate, // Versão inicial vigora desde o start_date
      totalVersionAmount,
      input.notes?.trim() || null,
    ]);
    const versionDb = versionRes.rows[0];

    // 6. Inserir itens snapshot
    const itemRecords: ContractItemRecord[] = [];
    for (const item of computedItems) {
      const insertItemSql = `
        INSERT INTO contract_items (
          contract_version_id, service_id, service_name, combo_id, combo_name,
          quantity, unit_price, unit_cost, total_price,
          supplier_id, supplier_name_snapshot, cost_periodicity, is_legacy_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false)
        RETURNING *
      `;
      const itemRes = await client.query<DbContractItemRow>(insertItemSql, [
        versionDb.id,
        item.serviceId,
        item.serviceName,
        item.comboId || null,
        item.comboName || null,
        item.quantity,
        item.unitPrice,
        item.unitCost,
        item.totalPrice,
        item.supplierId,
        item.supplierNameSnapshot,
        item.costPeriodicity,
      ]);
      itemRecords.push(mapItemRow(itemRes.rows[0]));
    }

    // 7. Inserir log de auditoria
    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('contracts', $1, 'INSERT', $2)`,
      [contractDb.id, JSON.stringify({ contractNumber, version: 1, total: totalVersionAmount })]
    );

    const versionRecord = mapVersionRow(versionDb, itemRecords);
    return mapContractRow(contractDb, versionRecord, [versionRecord]);
  });
}

/**
 * Cria uma nova versão de vigência para uma contratação existente (ex: reajuste, inclusão/remoção de serviço).
 * Preserva integralmente a versão anterior para fins de auditoria e competências históricas.
 */
export async function createContractVersion(
  input: CreateContractVersionInput
): Promise<ContractVersionRecord> {
  if (!input.contractId) {
    throw new Error("ID do contrato é obrigatório.");
  }
  if (!input.effectiveDate) {
    throw new Error("Data de vigência da nova versão é obrigatória.");
  }
  if (!input.items || input.items.length === 0) {
    throw new Error("A nova versão deve possuir pelo menos um serviço ou componente.");
  }

  return await withTransaction(async (client) => {
    // 1. Verificar se o contrato existe e não está cancelado
    const contractCheck = await client.query<{ id: string; status: ContractStatus }>(
      "SELECT id, status FROM contracts WHERE id = $1 FOR UPDATE",
      [input.contractId]
    );
    if (contractCheck.rowCount === 0) {
      throw new Error("Contrato não encontrado.");
    }
    if (contractCheck.rows[0].status === "CANCELED") {
      throw new Error("Não é possível versionar um contrato cancelado.");
    }

    // 2. Obter o maior version_number atual
    const maxVerRes = await client.query<{ max_ver: number }>(
      "SELECT COALESCE(MAX(version_number), 0) AS max_ver FROM contract_versions WHERE contract_id = $1",
      [input.contractId]
    );
    const newVersionNumber = maxVerRes.rows[0].max_ver + 1;

    // 3. Buscar nomes dos serviços e fornecedores
    const serviceIds = input.items.map((it) => it.serviceId);
    const servicesRes = await client.query<{
      id: string;
      name: string;
      default_supplier_id?: string | null;
      default_cost_periodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
    }>(
      `SELECT id, name, default_supplier_id, default_cost_periodicity FROM services WHERE id = ANY($1::uuid[])`,
      [serviceIds]
    );
    const serviceMap = new Map<string, {
      name: string;
      defaultSupplierId?: string | null;
      defaultCostPeriodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
    }>();
    servicesRes.rows.forEach((s) => serviceMap.set(s.id, {
      name: s.name,
      defaultSupplierId: s.default_supplier_id,
      defaultCostPeriodicity: s.default_cost_periodicity,
    }));

    const supplierIds = input.items
      .map((it) => it.supplierId || serviceMap.get(it.serviceId)?.defaultSupplierId)
      .filter((id): id is string => Boolean(id));
    const supplierNameMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const supRes = await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM suppliers WHERE id = ANY($1::uuid[])`,
        [supplierIds]
      );
      supRes.rows.forEach((sp) => supplierNameMap.set(sp.id, sp.name));
    }

    // 4. Calcular total
    let totalVersionAmount = 0;
    const computedItems = input.items.map((item) => {
      const qty = item.quantity > 0 ? item.quantity : 1;
      const uPrice = Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : 0;
      const uCost = Number(item.unitCost) >= 0 ? Number(item.unitCost) : 0;
      const itemTotal = Number((qty * uPrice).toFixed(2));
      totalVersionAmount = Number((totalVersionAmount + itemTotal).toFixed(2));

      const sInfo = serviceMap.get(item.serviceId);
      const serviceName = item.serviceName || sInfo?.name || "Serviço";
      const supplierId = item.supplierId || sInfo?.defaultSupplierId || null;
      const supplierNameSnapshot = item.supplierNameSnapshot || (supplierId ? supplierNameMap.get(supplierId) : null) || null;
      const costPeriodicity = item.costPeriodicity || sInfo?.defaultCostPeriodicity || "MONTHLY";

      return {
        ...item,
        quantity: qty,
        unitPrice: uPrice,
        unitCost: uCost,
        totalPrice: itemTotal,
        serviceName,
        supplierId,
        supplierNameSnapshot,
        costPeriodicity,
      };
    });

    // 5. Inserir nova versão
    const insertVersionSql = `
      INSERT INTO contract_versions (
        contract_id, version_number, title, description, billing_period,
        due_day, start_date, end_date, is_indefinite, effective_date,
        total_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const versionRes = await client.query<DbContractVersionRow>(insertVersionSql, [
      input.contractId,
      newVersionNumber,
      input.title?.trim() || `Revisão v${newVersionNumber}`,
      input.description?.trim() || null,
      input.billingPeriod,
      input.dueDay,
      input.startDate,
      input.isIndefinite ? null : input.endDate,
      Boolean(input.isIndefinite),
      input.effectiveDate,
      totalVersionAmount,
      input.notes?.trim() || null,
    ]);
    const versionDb = versionRes.rows[0];

    // 6. Inserir itens
    const itemRecords: ContractItemRecord[] = [];
    for (const item of computedItems) {
      const insertItemSql = `
        INSERT INTO contract_items (
          contract_version_id, service_id, service_name, combo_id, combo_name,
          quantity, unit_price, unit_cost, total_price,
          supplier_id, supplier_name_snapshot, cost_periodicity, is_legacy_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false)
        RETURNING *
      `;
      const itemRes = await client.query<DbContractItemRow>(insertItemSql, [
        versionDb.id,
        item.serviceId,
        item.serviceName,
        item.comboId || null,
        item.comboName || null,
        item.quantity,
        item.unitPrice,
        item.unitCost,
        item.totalPrice,
        item.supplierId,
        item.supplierNameSnapshot,
        item.costPeriodicity,
      ]);
      itemRecords.push(mapItemRow(itemRes.rows[0]));
    }

    // 7. Atualizar updated_at do contrato
    await client.query("UPDATE contracts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [
      input.contractId,
    ]);

    // 8. Auditoria
    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('contracts', $1, 'UPDATE', $2)`,
      [input.contractId, JSON.stringify({ versionNumber: newVersionNumber, total: totalVersionAmount, actionDetail: "NEW_VERSION" })]
    );

    return mapVersionRow(versionDb, itemRecords);
  });
}

/**
 * Cancela um contrato, registrando motivo e data do cancelamento.
 * Não exclui registros nem versões anteriores. Interrompe cobranças e previsões futuras.
 */
export async function cancelContract(input: CancelContractInput): Promise<ContractRecord> {
  if (!input.contractId) {
    throw new Error("ID do contrato é obrigatório.");
  }
  if (!input.cancellationReason || input.cancellationReason.trim().length === 0) {
    throw new Error("Motivo do cancelamento é obrigatório.");
  }

  await withTransaction(async (client) => {
    const checkRes = await client.query<{ id: string; status: ContractStatus }>(
      "SELECT id, status FROM contracts WHERE id = $1 FOR UPDATE",
      [input.contractId]
    );
    if (checkRes.rowCount === 0) {
      throw new Error("Contrato não encontrado.");
    }
    if (checkRes.rows[0].status === "CANCELED") {
      throw new Error("O contrato já se encontra cancelado.");
    }

    const cancelDate = input.canceledAt ? new Date(input.canceledAt) : new Date();

    const updateSql = `
      UPDATE contracts
      SET status = 'CANCELED',
          cancellation_reason = $1,
          canceled_at = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    await client.query<DbContractRow>(updateSql, [
      input.cancellationReason.trim(),
      cancelDate,
      input.contractId,
    ]);

    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ('contracts', $1, 'UPDATE', $2)`,
      [input.contractId, JSON.stringify({ reason: input.cancellationReason, canceledAt: cancelDate, actionDetail: "CANCEL" })]
    );
  });

  const contract = await getContractById(input.contractId);
  if (!contract) {
    throw new Error("Erro ao recuperar contrato cancelado.");
  }
  return contract;
}

/**
 * Obtém os detalhes completos de um contrato pelo ID, incluindo todas as versões e itens históricos.
 */
export async function getContractById(id: string): Promise<ContractRecord | null> {
  const contractSql = `
    SELECT c.*, cl.name AS client_name, cl.trade_name AS client_trade_name, cl.document AS client_document
    FROM contracts c
    JOIN clients cl ON cl.id = c.client_id
    WHERE c.id = $1
  `;
  const contractRes = await query<DbContractRow>(contractSql, [id]);
  if (contractRes.rowCount === 0) {
    return null;
  }
  const contractRow = contractRes.rows[0];

  // Buscar todas as versões ordenadas da mais recente para a mais antiga
  const versionsSql = `
    SELECT * FROM contract_versions
    WHERE contract_id = $1
    ORDER BY version_number DESC
  `;
  const versionsRes = await query<DbContractVersionRow>(versionsSql, [id]);

  if (versionsRes.rows.length === 0) {
    return mapContractRow(contractRow);
  }

  const versionIds = versionsRes.rows.map((v) => v.id);
  const itemsSql = `
    SELECT * FROM contract_items
    WHERE contract_version_id = ANY($1::uuid[])
    ORDER BY created_at ASC
  `;
  const itemsRes = await query<DbContractItemRow>(itemsSql, [versionIds]);

  const itemsByVersion = new Map<string, ContractItemRecord[]>();
  for (const itemRow of itemsRes.rows) {
    const list = itemsByVersion.get(itemRow.contract_version_id) || [];
    list.push(mapItemRow(itemRow));
    itemsByVersion.set(itemRow.contract_version_id, list);
  }

  const versions: ContractVersionRecord[] = versionsRes.rows.map((v) =>
    mapVersionRow(v, itemsByVersion.get(v.id) || [])
  );

  const currentVersion = versions[0]; // Versão mais recente
  return mapContractRow(contractRow, currentVersion, versions);
}

/**
 * Listagem paginada de contratos com filtros avançados.
 */
export async function listContracts(params: {
  clientId?: string;
  search?: string;
  status?: ContractStatus;
  limit?: number;
  offset?: number;
}): Promise<{ contracts: ContractRecord[]; total: number }> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const conditions: string[] = [];
  const queryParams: unknown[] = [];
  let paramIdx = 1;

  if (params.clientId) {
    conditions.push(`c.client_id = $${paramIdx++}`);
    queryParams.push(params.clientId);
  }

  if (params.status) {
    conditions.push(`c.status = $${paramIdx++}`);
    queryParams.push(params.status);
  }

  if (params.search && params.search.trim().length > 0) {
    const searchPattern = `%${params.search.trim()}%`;
    conditions.push(
      `(c.contract_number ILIKE $${paramIdx} OR cl.name ILIKE $${paramIdx} OR cl.trade_name ILIKE $${paramIdx} OR cv.title ILIKE $${paramIdx})`
    );
    queryParams.push(searchPattern);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Contagem
  const countSql = `
    SELECT COUNT(DISTINCT c.id) as total
    FROM contracts c
    JOIN clients cl ON cl.id = c.client_id
    LEFT JOIN LATERAL (
      SELECT title FROM contract_versions
      WHERE contract_id = c.id
      ORDER BY version_number DESC LIMIT 1
    ) cv ON true
    ${whereClause}
  `;
  const countRes = await query<{ total: string }>(countSql, queryParams);
  const total = parseInt(countRes.rows[0]?.total || "0", 10);

  // Lista de contratos com versão atual via LATERAL
  const listSql = `
    SELECT 
      c.*,
      cl.name AS client_name,
      cl.trade_name AS client_trade_name,
      cl.document AS client_document,
      cv.id AS v_id,
      cv.version_number AS v_version_number,
      cv.title AS v_title,
      cv.billing_period AS v_billing_period,
      cv.due_day AS v_due_day,
      cv.start_date AS v_start_date,
      cv.end_date AS v_end_date,
      cv.is_indefinite AS v_is_indefinite,
      cv.effective_date AS v_effective_date,
      cv.total_amount AS v_total_amount,
      cv.created_at AS v_created_at
    FROM contracts c
    JOIN clients cl ON cl.id = c.client_id
    LEFT JOIN LATERAL (
      SELECT * FROM contract_versions
      WHERE contract_id = c.id
      ORDER BY version_number DESC LIMIT 1
    ) cv ON true
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx}
  `;
  queryParams.push(limit, offset);

  const res = await query<
    DbContractRow & {
      v_id: string | null;
      v_version_number: number | null;
      v_title: string | null;
      v_billing_period: "ONE_TIME" | "MONTHLY" | "YEARLY" | null;
      v_due_day: number | null;
      v_start_date: string | Date | null;
      v_end_date: string | Date | null;
      v_is_indefinite: boolean | null;
      v_effective_date: string | Date | null;
      v_total_amount: string | number | null;
      v_created_at: Date | null;
    }
  >(listSql, queryParams);

  const contracts: ContractRecord[] = res.rows.map((row) => {
    let currentVersion: ContractVersionRecord | undefined;
    if (row.v_id) {
      currentVersion = {
        id: row.v_id,
        contractId: row.id,
        versionNumber: row.v_version_number || 1,
        title: row.v_title || "",
        billingPeriod: row.v_billing_period || "MONTHLY",
        dueDay: row.v_due_day || 10,
        startDate: formatDate(row.v_start_date) || "",
        endDate: formatDate(row.v_end_date),
        isIndefinite: Boolean(row.v_is_indefinite),
        effectiveDate: formatDate(row.v_effective_date) || "",
        totalAmount: Number(row.v_total_amount || 0),
        createdAt: row.v_created_at ? row.v_created_at.toISOString() : "",
      };
    }
    return mapContractRow(row, currentVersion);
  });

  return { contracts, total };
}

/**
 * Prepara previsões e projeções financeiras das competências sem realizar geração de títulos.
 * Usa as versões da contratação válidas em cada competência para determinar o valor e dia de vencimento.
 */
export function getContractProjections(
  contract: ContractRecord,
  startYearMonth: { year: number; month: number },
  countMonths: number = 12
): RecurrenceProjection[] {
  const projections: RecurrenceProjection[] = [];
  if (!contract.versions || contract.versions.length === 0) {
    if (contract.currentVersion) {
      contract.versions = [contract.currentVersion];
    } else {
      return projections;
    }
  }

  // Ordenar versões por data de vigência crescente
  const sortedVersions = [...contract.versions].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );

  let currentYear = startYearMonth.year;
  let currentMonth = startYearMonth.month;

  for (let i = 0; i < countMonths; i++) {
    const compMonthStr = String(currentMonth).padStart(2, "0");
    const compKey = `${currentYear}-${compMonthStr}`;
    const compDate = new Date(`${compKey}-01`);

    // Encontrar qual versão é válida para esta competência
    // Uma versão é válida se effectiveDate <= compDate
    let activeVer = sortedVersions[0];
    for (const v of sortedVersions) {
      if (new Date(v.effectiveDate) <= compDate) {
        activeVer = v;
      }
    }

    // Se o contrato for avulso (ONE_TIME), gera apenas para o mês de início
    if (activeVer.billingPeriod === "ONE_TIME") {
      const verStartMonth = activeVer.startDate.slice(0, 7);
      if (compKey !== verStartMonth) {
        // Avançar mês
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
        continue;
      }
    }

    // Se a periodicidade for anual, apenas ocorre no mês de início a cada 12 meses
    if (activeVer.billingPeriod === "YEARLY") {
      const startMonthNum = parseInt(activeVer.startDate.slice(5, 7), 10);
      if (currentMonth !== startMonthNum) {
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
        continue;
      }
    }

    // Verificar se a competência ultrapassa o término da vigência
    let isPastOrCanceled = false;
    if (!activeVer.isIndefinite && activeVer.endDate) {
      const endDate = new Date(activeVer.endDate);
      if (compDate > endDate) {
        isPastOrCanceled = true;
      }
    }

    // Se contrato estiver cancelado, verificar se a competência é posterior à data de cancelamento
    if (contract.status === "CANCELED" && contract.canceledAt) {
      const cancelDate = new Date(contract.canceledAt);
      if (compDate >= cancelDate) {
        isPastOrCanceled = true;
      }
    }

    const effectiveDueDate = calculateEffectiveDueDate(
      activeVer.dueDay,
      currentYear,
      currentMonth
    );
    const idempotencyKey = generateBillingPeriodKey(contract.id, currentYear, currentMonth);

    projections.push({
      competency: compKey,
      effectiveDueDate,
      idempotencyKey,
      amount: activeVer.totalAmount,
      versionNumber: activeVer.versionNumber,
      isPastOrCanceled,
    });

    // Avançar mês
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return projections;
}
