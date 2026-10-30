import { query, withTransaction } from "@/lib/db/pool";
import {
  ServiceCategory,
  ServiceItem,
  Combo,
  ComboItem,
  CreateServiceDTO,
  CreateComboDTO,
} from "./types";

interface DbCategoryRow {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  parent_name?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

interface DbServiceRow {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  default_supplier_id?: string | null;
  default_supplier_name?: string | null;
  default_cost_periodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
  name: string;
  description: string | null;
  default_price: string;
  default_cost: string;
  billing_unit: "HORA" | "MES" | "UNIDADE" | "PROJETO" | "ANUAL";
  status: "ACTIVE" | "ARCHIVED";
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

interface DbComboRow {
  id: string;
  name: string;
  description: string | null;
  total_price: string;
  status: "ACTIVE" | "ARCHIVED";
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

interface DbComboItemRow {
  id: string;
  combo_id: string;
  service_id: string;
  service_name: string;
  default_price: string;
  component_price: string;
}

// -----------------------------------------------------------------------------
// CATEGORIAS DE SERVIÇOS
// -----------------------------------------------------------------------------
export async function listServiceCategories(options?: {
  status?: "ACTIVE" | "ARCHIVED";
}): Promise<ServiceCategory[]> {
  let sql = `
    SELECT c.*, p.name as parent_name 
    FROM service_categories c
    LEFT JOIN service_categories p ON c.parent_id = p.id
  `;
  const params: unknown[] = [];
  if (options?.status) {
    sql += ` WHERE c.status = $1`;
    params.push(options.status);
  }
  sql += ` ORDER BY c.name ASC`;

  const res = await query<DbCategoryRow>(sql, params);
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    parentId: r.parent_id,
    parentName: r.parent_name || null,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    archivedAt: r.archived_at ? r.archived_at.toISOString() : null,
  }));
}

export async function createServiceCategory(data: {
  name: string;
  description?: string | null;
  parentId?: string | null;
}): Promise<ServiceCategory> {
  if (!data.name || data.name.trim() === "") {
    throw new Error("O nome da categoria é obrigatório.");
  }

  const res = await query<DbCategoryRow>(
    `INSERT INTO service_categories (name, description, parent_id, status)
     VALUES ($1, $2, $3, 'ACTIVE')
     RETURNING *`,
    [data.name.trim(), data.description?.trim() || null, data.parentId || null]
  );

  return {
    id: res.rows[0].id,
    name: res.rows[0].name,
    description: res.rows[0].description,
    parentId: res.rows[0].parent_id,
    status: res.rows[0].status,
    createdAt: res.rows[0].created_at.toISOString(),
    updatedAt: res.rows[0].updated_at.toISOString(),
  };
}

export async function updateServiceCategory(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    parentId?: string | null;
    status?: "ACTIVE" | "ARCHIVED" | "INACTIVE";
  }
): Promise<ServiceCategory> {
  const existingRes = await query<DbCategoryRow>("SELECT * FROM service_categories WHERE id = $1", [id]);
  if (existingRes.rows.length === 0) throw new Error("Categoria não encontrada.");
  const existing = existingRes.rows[0];

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  if (!name) throw new Error("O nome da categoria não pode ser vazio.");
  const description = data.description !== undefined ? data.description?.trim() || null : existing.description;
  const parentId = data.parentId !== undefined ? data.parentId || null : existing.parent_id;
  const status = data.status !== undefined ? data.status : existing.status;

  if (parentId === id) {
    throw new Error("Uma categoria não pode ter a si mesma como categoria pai.");
  }

  const res = await query<DbCategoryRow>(
    `UPDATE service_categories
     SET name = $1, description = $2, parent_id = $3, status = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [name, description, parentId, status, id]
  );

  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
     VALUES ($1, $2, $3, $4)`,
    ["service_categories", id, "UPDATE", JSON.stringify({ name, parentId, status })]
  );

  return {
    id: res.rows[0].id,
    name: res.rows[0].name,
    description: res.rows[0].description,
    parentId: res.rows[0].parent_id,
    status: res.rows[0].status,
    createdAt: res.rows[0].created_at.toISOString(),
    updatedAt: res.rows[0].updated_at.toISOString(),
  };
}

export async function deleteServiceCategory(id: string): Promise<{ action: "deleted" | "archived"; message: string }> {
  // Check child categories
  const childCheck = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM service_categories WHERE parent_id = $1",
    [id]
  );
  const childCount = parseInt(childCheck.rows[0]?.count || "0", 10);
  if (childCount > 0) {
    throw new Error(`Não é possível excluir esta categoria pois ela possui ${childCount} subcategoria(s) vinculada(s). Remova ou reatribua as subcategorias primeiro.`);
  }

  // Check referenced services
  const svcCheck = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM services WHERE category_id = $1",
    [id]
  );
  const svcCount = parseInt(svcCheck.rows[0]?.count || "0", 10);

  if (svcCount > 0) {
    // Soft delete / archive to avoid breaking FK
    await query("UPDATE service_categories SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    await query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ($1, $2, $3, $4)`,
      ["service_categories", id, "UPDATE", JSON.stringify({ action: "ARCHIVED", reason: "Has linked services" })]
    );
    return {
      action: "archived",
      message: `Categoria arquivada com sucesso! Ela foi desativada pois possui ${svcCount} serviço(s) vinculado(s).`,
    };
  }

  await query("DELETE FROM service_categories WHERE id = $1", [id]);
  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, old_data)
     VALUES ($1, $2, $3, $4)`,
    ["service_categories", id, "DELETE", JSON.stringify({ id })]
  );

  return {
    action: "deleted",
    message: "Categoria excluída permanentemente com sucesso!",
  };
}

// -----------------------------------------------------------------------------
// SERVIÇOS
// -----------------------------------------------------------------------------
export async function listServices(options?: {
  search?: string;
  status?: "ACTIVE" | "ARCHIVED";
  categoryId?: string;
}): Promise<ServiceItem[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.status) {
    conditions.push(`s.status = $${paramIdx++}`);
    params.push(options.status);
  }

  if (options?.categoryId) {
    conditions.push(`s.category_id = $${paramIdx++}`);
    params.push(options.categoryId);
  }

  if (options?.search) {
    conditions.push(`LOWER(s.name) LIKE $${paramIdx++}`);
    params.push(`%${options.search.trim().toLowerCase()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT s.*, c.name as category_name, sup.name as default_supplier_name
    FROM services s
    LEFT JOIN service_categories c ON s.category_id = c.id
    LEFT JOIN suppliers sup ON s.default_supplier_id = sup.id
    ${whereClause}
    ORDER BY s.name ASC
  `;

  const res = await query<DbServiceRow>(sql, params);
  return res.rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name || null,
    defaultSupplierId: r.default_supplier_id || null,
    defaultSupplierName: r.default_supplier_name || null,
    defaultCostPeriodicity: r.default_cost_periodicity || "MONTHLY",
    name: r.name,
    description: r.description,
    defaultPrice: parseFloat(r.default_price || "0"),
    defaultCost: parseFloat(r.default_cost || "0"),
    billingUnit: r.billing_unit,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    archivedAt: r.archived_at ? r.archived_at.toISOString() : null,
  }));
}

export async function getServiceById(id: string): Promise<ServiceItem | null> {
  const res = await query<DbServiceRow>(
    `SELECT s.*, c.name as category_name, sup.name as default_supplier_name
     FROM services s
     LEFT JOIN service_categories c ON s.category_id = c.id
     LEFT JOIN suppliers sup ON s.default_supplier_id = sup.id
     WHERE s.id = $1`,
    [id]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name || null,
    defaultSupplierId: r.default_supplier_id || null,
    defaultSupplierName: r.default_supplier_name || null,
    defaultCostPeriodicity: r.default_cost_periodicity || "MONTHLY",
    name: r.name,
    description: r.description,
    defaultPrice: parseFloat(r.default_price || "0"),
    defaultCost: parseFloat(r.default_cost || "0"),
    billingUnit: r.billing_unit,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    archivedAt: r.archived_at ? r.archived_at.toISOString() : null,
  };
}

export async function createService(data: CreateServiceDTO): Promise<ServiceItem> {
  if (!data.name || data.name.trim() === "") {
    throw new Error("O nome do serviço é obrigatório.");
  }
  if (data.defaultPrice < 0) {
    throw new Error("O preço padrão não pode ser negativo.");
  }
  if (data.defaultCost < 0) {
    throw new Error("O custo padrão não pode ser negativo.");
  }

  const res = await query<DbServiceRow>(
    `INSERT INTO services (
      category_id, name, description, default_price, default_cost, billing_unit, status,
      default_supplier_id, default_cost_periodicity
    ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8)
    RETURNING *`,
    [
      data.categoryId || null,
      data.name.trim(),
      data.description?.trim() || null,
      data.defaultPrice,
      data.defaultCost,
      data.billingUnit,
      data.defaultSupplierId || null,
      data.defaultCostPeriodicity || "MONTHLY",
    ]
  );

  const r = res.rows[0];
  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
     VALUES ($1, $2, $3, $4)`,
    ["services", r.id, "INSERT", JSON.stringify({ name: r.name, price: r.default_price })]
  );

  return {
    id: r.id,
    categoryId: r.category_id,
    defaultSupplierId: r.default_supplier_id || null,
    defaultCostPeriodicity: r.default_cost_periodicity || "MONTHLY",
    name: r.name,
    description: r.description,
    defaultPrice: parseFloat(r.default_price || "0"),
    defaultCost: parseFloat(r.default_cost || "0"),
    billingUnit: r.billing_unit,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function updateService(
  id: string,
  data: Partial<CreateServiceDTO> & { status?: "ACTIVE" | "ARCHIVED" }
): Promise<ServiceItem> {
  const existing = await getServiceById(id);
  if (!existing) {
    throw new Error("Serviço não encontrado.");
  }

  const res = await query<DbServiceRow>(
    `UPDATE services SET
      category_id = COALESCE($1, category_id),
      name = COALESCE($2, name),
      description = $3,
      default_price = COALESCE($4, default_price),
      default_cost = COALESCE($5, default_cost),
      billing_unit = COALESCE($6, billing_unit),
      status = COALESCE($7, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *`,
    [
      data.categoryId !== undefined ? data.categoryId : existing.categoryId,
      data.name ? data.name.trim() : null,
      data.description !== undefined ? data.description?.trim() || null : existing.description,
      data.defaultPrice !== undefined ? data.defaultPrice : null,
      data.defaultCost !== undefined ? data.defaultCost : null,
      data.billingUnit || null,
      data.status || null,
      id,
    ]
  );

  const r = res.rows[0];
  return {
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    defaultPrice: parseFloat(r.default_price || "0"),
    defaultCost: parseFloat(r.default_cost || "0"),
    billingUnit: r.billing_unit,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function archiveService(id: string): Promise<void> {
  await query(
    `UPDATE services SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
     VALUES ($1, $2, $3, $4)`,
    ["services", id, "UPDATE", JSON.stringify({ action: "ARCHIVE" })]
  );
}

export async function reactivateService(id: string): Promise<void> {
  await query(
    `UPDATE services SET status = 'ACTIVE', archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}

export async function deleteService(id: string): Promise<{ action: "deleted" | "archived"; message: string }> {
  // Check usage in contracts
  const contractCheck = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM contract_items WHERE service_id = $1",
    [id]
  );
  // Check usage in combos
  const comboCheck = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM combo_items WHERE service_id = $1",
    [id]
  );
  // Check usage in payables
  const payableCheck = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM payables WHERE service_id = $1",
    [id]
  );

  const contractCount = parseInt(contractCheck.rows[0]?.count || "0", 10);
  const comboCount = parseInt(comboCheck.rows[0]?.count || "0", 10);
  const payableCount = parseInt(payableCheck.rows[0]?.count || "0", 10);

  if (contractCount > 0 || comboCount > 0 || payableCount > 0) {
    await archiveService(id);
    return {
      action: "archived",
      message: `Serviço arquivado com sucesso! Como possui movimentações históricas (${contractCount} contratos, ${comboCount} combos, ${payableCount} despesas), ele foi mantido como inativo para preservar a rastreabilidade contábil.`,
    };
  }

  // If clean, remove bindings and delete
  await query("DELETE FROM supplier_cost_bindings WHERE service_id = $1", [id]);
  await query("DELETE FROM services WHERE id = $1", [id]);
  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, old_data)
     VALUES ($1, $2, $3, $4)`,
    ["services", id, "DELETE", JSON.stringify({ id })]
  );

  return {
    action: "deleted",
    message: "Serviço excluído permanentemente com sucesso!",
  };
}

// -----------------------------------------------------------------------------
// COMBOS (AGRUPAMENTOS COMERCIAIS REUTILIZÁVEIS)
// -----------------------------------------------------------------------------
export async function listCombos(options?: {
  search?: string;
  status?: "ACTIVE" | "ARCHIVED";
}): Promise<Combo[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  if (options?.search) {
    conditions.push(`LOWER(name) LIKE $${paramIdx++}`);
    params.push(`%${options.search.trim().toLowerCase()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM combos ${whereClause} ORDER BY name ASC`;

  const res = await query<DbComboRow>(sql, params);
  const combos: Combo[] = [];

  for (const r of res.rows) {
    const itemsRes = await query<DbComboItemRow>(
      `SELECT ci.*, s.name as service_name, s.default_price
       FROM combo_items ci
       JOIN services s ON ci.service_id = s.id
       WHERE ci.combo_id = $1`,
      [r.id]
    );

    combos.push({
      id: r.id,
      name: r.name,
      description: r.description,
      totalPrice: parseFloat(r.total_price || "0"),
      status: r.status,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
      archivedAt: r.archived_at ? r.archived_at.toISOString() : null,
      items: itemsRes.rows.map((item) => ({
        id: item.id,
        comboId: item.combo_id,
        serviceId: item.service_id,
        serviceName: item.service_name,
        defaultPrice: parseFloat(item.default_price || "0"),
        componentPrice: parseFloat(item.component_price || "0"),
      })),
    });
  }

  return combos;
}

export async function getComboById(id: string): Promise<Combo | null> {
  const res = await query<DbComboRow>(`SELECT * FROM combos WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  const itemsRes = await query<DbComboItemRow>(
    `SELECT ci.*, s.name as service_name, s.default_price
     FROM combo_items ci
     JOIN services s ON ci.service_id = s.id
     WHERE ci.combo_id = $1`,
    [id]
  );

  return {
    id: r.id,
    name: r.name,
    description: r.description,
    totalPrice: parseFloat(r.total_price || "0"),
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    archivedAt: r.archived_at ? r.archived_at.toISOString() : null,
    items: itemsRes.rows.map((item) => ({
      id: item.id,
      comboId: item.combo_id,
      serviceId: item.service_id,
      serviceName: item.service_name,
      defaultPrice: parseFloat(item.default_price || "0"),
      componentPrice: parseFloat(item.component_price || "0"),
    })),
  };
}

export async function createCombo(data: CreateComboDTO): Promise<Combo> {
  if (!data.name || data.name.trim() === "") {
    throw new Error("O nome do combo é obrigatório.");
  }
  if (!data.items || data.items.length < 2) {
    throw new Error("Um combo comercial deve conter pelo menos 2 serviços associados.");
  }

  // Preço total é a soma estrita dos componentes
  let calculatedTotal = 0;
  for (const item of data.items) {
    if (item.componentPrice < 0) {
      throw new Error("O preço do componente no combo não pode ser negativo.");
    }
    calculatedTotal += item.componentPrice;
  }
  // Arredondamento para 2 casas
  calculatedTotal = Math.round(calculatedTotal * 100) / 100;

  return await withTransaction(async (client) => {
    const insertComboSql = `
      INSERT INTO combos (name, description, total_price, status)
      VALUES ($1, $2, $3, 'ACTIVE')
      RETURNING *;
    `;
    const res = await client.query<DbComboRow>(insertComboSql, [
      data.name.trim(),
      data.description?.trim() || null,
      calculatedTotal,
    ]);
    const combo = res.rows[0];

    // Inserir itens
    const items: ComboItem[] = [];
    for (const item of data.items) {
      const itemRes = await client.query<DbComboItemRow>(
        `INSERT INTO combo_items (combo_id, service_id, component_price)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [combo.id, item.serviceId, item.componentPrice]
      );
      items.push({
        id: itemRes.rows[0].id,
        comboId: combo.id,
        serviceId: item.serviceId,
        componentPrice: item.componentPrice,
      });
    }

    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ($1, $2, $3, $4)`,
      ["combos", combo.id, "INSERT", JSON.stringify({ name: combo.name, total: calculatedTotal })]
    );

    return {
      id: combo.id,
      name: combo.name,
      description: combo.description,
      totalPrice: calculatedTotal,
      status: combo.status,
      createdAt: combo.created_at.toISOString(),
      updatedAt: combo.updated_at.toISOString(),
      items,
    };
  });
}

export async function archiveCombo(id: string): Promise<void> {
  await query(
    `UPDATE combos SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
     VALUES ($1, $2, $3, $4)`,
    ["combos", id, "UPDATE", JSON.stringify({ action: "ARCHIVE" })]
  );
}

export async function reactivateCombo(id: string): Promise<void> {
  await query(
    `UPDATE combos SET status = 'ACTIVE', archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}

export async function deleteCombo(id: string): Promise<{ action: "deleted" | "archived"; message: string }> {
  const contractCheck = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM contract_items WHERE combo_id = $1",
    [id]
  );
  const contractCount = parseInt(contractCheck.rows[0]?.count || "0", 10);
  if (contractCount > 0) {
    await archiveCombo(id);
    return {
      action: "archived",
      message: `Combo arquivado com sucesso! Como já foi vinculado a ${contractCount} contrato(s), ele foi desativado para preservar os contratos.`,
    };
  }

  return await withTransaction(async (client) => {
    await client.query("DELETE FROM combo_items WHERE combo_id = $1", [id]);
    await client.query("DELETE FROM combos WHERE id = $1", [id]);
    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, old_data)
       VALUES ($1, $2, $3, $4)`,
      ["combos", id, "DELETE", JSON.stringify({ id })]
    );
    return {
      action: "deleted",
      message: "Combo excluído permanentemente com sucesso!",
    };
  });
}

