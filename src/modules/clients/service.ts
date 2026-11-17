import { query, withTransaction } from "@/lib/db/pool";
import { DocumentService } from "@/modules/documents/service";
import { normalizeDocument, validateCPF, validateCNPJ } from "@/shared/cpf-cnpj";
import { Client, CreateClientDTO, UpdateClientDTO } from "./types";

interface DbClientRow {
  id: string;
  type: "PF" | "PJ";
  name: string;
  trade_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  status: "ACTIVE" | "ARCHIVED";
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

interface DbContactRow {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapClientRow(row: DbClientRow): Client {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    tradeName: row.trade_name,
    document: row.document,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    archivedAt: row.archived_at ? row.archived_at.toISOString() : null,
  };
}

export async function listClients(options?: {
  search?: string;
  status?: "ACTIVE" | "ARCHIVED";
  type?: "PF" | "PJ";
  limit?: number;
  offset?: number;
  orderBy?: "name" | "created_at";
  orderDirection?: "asc" | "desc";
}): Promise<{ clients: Client[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  if (options?.type) {
    conditions.push(`type = $${paramIdx++}`);
    params.push(options.type);
  }

  if (options?.search) {
    const s = `%${options.search.trim().toLowerCase()}%`;
    const docClean = normalizeDocument(options.search);
    if (docClean.length > 3) {
      conditions.push(
        `(LOWER(name) LIKE $${paramIdx} OR LOWER(COALESCE(trade_name, '')) LIKE $${paramIdx} OR document LIKE $${paramIdx + 1})`
      );
      params.push(s, `%${docClean}%`);
      paramIdx += 2;
    } else {
      conditions.push(
        `(LOWER(name) LIKE $${paramIdx} OR LOWER(COALESCE(trade_name, '')) LIKE $${paramIdx} OR LOWER(COALESCE(email, '')) LIKE $${paramIdx})`
      );
      params.push(s);
      paramIdx++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Sorting
  const sortCol = options?.orderBy === "name" ? "name" : "created_at";
  const sortDir = options?.orderDirection === "asc" ? "ASC" : "DESC";

  // Pagination
  const limit = Math.max(1, Math.min(100, options?.limit || 20));
  const offset = Math.max(0, options?.offset || 0);

  const selectSql = `
    SELECT * FROM clients 
    ${whereClause} 
    ORDER BY ${sortCol} ${sortDir} 
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  // Execução concorrente de contagem e seleção para eliminar waterfall
  const [countRes, rowsRes] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::int as count FROM clients ${whereClause}`, params),
    query<DbClientRow>(selectSql, [...params, limit, offset]),
  ]);

  const total = parseInt(countRes.rows[0]?.count || "0", 10);
  const clients = rowsRes.rows.map(mapClientRow);

  return { clients, total };
}

export async function getClientById(id: string): Promise<Client | null> {
  // Busca simultânea de dados cadastrais e contatos
  const [clientRes, contactsRes] = await Promise.all([
    query<DbClientRow>(`SELECT * FROM clients WHERE id = $1`, [id]),
    query<DbContactRow>(
      `SELECT * FROM client_contacts WHERE client_id = $1 ORDER BY is_primary DESC, name ASC`,
      [id]
    ),
  ]);

  if (clientRes.rows.length === 0) return null;

  const client = mapClientRow(clientRes.rows[0]);

  client.contacts = contactsRes.rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    role: r.role,
    email: r.email,
    phone: r.phone,
    whatsapp: r.whatsapp,
    isPrimary: r.is_primary,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }));

  return client;
}

export async function createClient(data: CreateClientDTO): Promise<Client> {
  // Validate and normalize document if provided
  let cleanDoc: string | null = null;
  if (data.document && data.document.trim() !== "") {
    cleanDoc = normalizeDocument(data.document);
    if (data.type === "PF") {
      if (!validateCPF(cleanDoc)) {
        throw new Error("CPF informado é inválido.");
      }
    } else {
      if (!validateCNPJ(cleanDoc)) {
        throw new Error("CNPJ informado é inválido.");
      }
    }

    // Check uniqueness for active clients
    const dupCheck = await query(
      `SELECT id FROM clients WHERE document = $1 AND status = 'ACTIVE'`,
      [cleanDoc]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error("Já existe um cliente ativo cadastrado com este CPF/CNPJ.");
    }
  }

  return await withTransaction(async (client) => {
    const insertSql = `
      INSERT INTO clients (
        type, name, trade_name, document, email, phone, whatsapp,
        postal_code, street, number, complement, neighborhood, city, state,
        notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, 'ACTIVE'
      ) RETURNING *;
    `;
    const params = [
      data.type,
      data.name.trim(),
      data.tradeName?.trim() || null,
      cleanDoc,
      data.email?.trim() || null,
      data.phone?.trim() || null,
      data.whatsapp?.trim() || null,
      data.postalCode?.trim() || null,
      data.street?.trim() || null,
      data.number?.trim() || null,
      data.complement?.trim() || null,
      data.neighborhood?.trim() || null,
      data.city?.trim() || null,
      data.state?.trim() || null,
      data.notes?.trim() || null,
    ];

    const res = await client.query<DbClientRow>(insertSql, params);
    const newClient = mapClientRow(res.rows[0]);

    // Insert contacts if any
    if (data.contacts && data.contacts.length > 0) {
      for (const contact of data.contacts) {
        if (!contact.name || contact.name.trim() === "") continue;
        await client.query(
          `INSERT INTO client_contacts (client_id, name, role, email, phone, whatsapp, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newClient.id,
            contact.name.trim(),
            contact.role?.trim() || null,
            contact.email?.trim() || null,
            contact.phone?.trim() || null,
            contact.whatsapp?.trim() || null,
            Boolean(contact.isPrimary),
          ]
        );
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ($1, $2, $3, $4)`,
      ["clients", newClient.id, "INSERT", JSON.stringify({ name: newClient.name, type: newClient.type })]
    );

    return newClient;
  });
}

export async function updateClient(id: string, data: UpdateClientDTO): Promise<Client> {
  const existing = await getClientById(id);
  if (!existing) {
    throw new Error("Cliente não encontrado.");
  }

  let cleanDoc = existing.document;
  if (data.document !== undefined) {
    if (data.document && data.document.trim() !== "") {
      cleanDoc = normalizeDocument(data.document);
      const docType = data.type || existing.type;
      if (docType === "PF" && !validateCPF(cleanDoc)) {
        throw new Error("CPF informado é inválido.");
      }
      if (docType === "PJ" && !validateCNPJ(cleanDoc)) {
        throw new Error("CNPJ informado é inválido.");
      }

      // Check unique active
      const dupCheck = await query(
        `SELECT id FROM clients WHERE document = $1 AND status = 'ACTIVE' AND id <> $2`,
        [cleanDoc, id]
      );
      if (dupCheck.rows.length > 0) {
        throw new Error("Já existe outro cliente ativo cadastrado com este CPF/CNPJ.");
      }
    } else {
      cleanDoc = null;
    }
  }

  return await withTransaction(async (client) => {
    const updateSql = `
      UPDATE clients SET
        type = COALESCE($1, type),
        name = COALESCE($2, name),
        trade_name = $3,
        document = $4,
        email = $5,
        phone = $6,
        whatsapp = $7,
        postal_code = $8,
        street = $9,
        number = $10,
        complement = $11,
        neighborhood = $12,
        city = $13,
        state = $14,
        notes = $15,
        status = COALESCE($16, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *;
    `;
    const params = [
      data.type || null,
      data.name ? data.name.trim() : null,
      data.tradeName !== undefined ? data.tradeName?.trim() || null : existing.tradeName,
      cleanDoc,
      data.email !== undefined ? data.email?.trim() || null : existing.email,
      data.phone !== undefined ? data.phone?.trim() || null : existing.phone,
      data.whatsapp !== undefined ? data.whatsapp?.trim() || null : existing.whatsapp,
      data.postalCode !== undefined ? data.postalCode?.trim() || null : existing.postalCode,
      data.street !== undefined ? data.street?.trim() || null : existing.street,
      data.number !== undefined ? data.number?.trim() || null : existing.number,
      data.complement !== undefined ? data.complement?.trim() || null : existing.complement,
      data.neighborhood !== undefined ? data.neighborhood?.trim() || null : existing.neighborhood,
      data.city !== undefined ? data.city?.trim() || null : existing.city,
      data.state !== undefined ? data.state?.trim() || null : existing.state,
      data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
      data.status || null,
      id,
    ];

    const res = await client.query<DbClientRow>(updateSql, params);
    const updatedClient = mapClientRow(res.rows[0]);

    // If contacts provided, replace them safely
    if (data.contacts !== undefined) {
      await client.query(`DELETE FROM client_contacts WHERE client_id = $1`, [id]);
      if (data.contacts && data.contacts.length > 0) {
        for (const contact of data.contacts) {
          if (!contact.name || contact.name.trim() === "") continue;
          await client.query(
            `INSERT INTO client_contacts (client_id, name, role, email, phone, whatsapp, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id,
              contact.name.trim(),
              contact.role?.trim() || null,
              contact.email?.trim() || null,
              contact.phone?.trim() || null,
              contact.whatsapp?.trim() || null,
              Boolean(contact.isPrimary),
            ]
          );
        }
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "clients",
        id,
        "UPDATE",
        JSON.stringify({ name: existing.name, status: existing.status }),
        JSON.stringify({ name: updatedClient.name, status: updatedClient.status }),
      ]
    );

    return updatedClient;
  });
}

export async function archiveClient(id: string): Promise<Client> {
  const res = await query<DbClientRow>(
    `UPDATE clients 
     SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 RETURNING *`,
    [id]
  );
  if (res.rows.length === 0) {
    throw new Error("Cliente não encontrado.");
  }
  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
     VALUES ($1, $2, $3, $4)`,
    ["clients", id, "UPDATE", JSON.stringify({ action: "ARCHIVE" })]
  );
  return mapClientRow(res.rows[0]);
}

export async function reactivateClient(id: string): Promise<Client> {
  const existing = await getClientById(id);
  if (!existing) {
    throw new Error("Cliente não encontrado.");
  }

  // If client has document, ensure no other active client already uses it
  if (existing.document) {
    const dupCheck = await query(
      `SELECT id FROM clients WHERE document = $1 AND status = 'ACTIVE' AND id <> $2`,
      [existing.document, id]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error("Não é possível reativar: já existe outro cliente ativo com este CPF/CNPJ.");
    }
  }

  const res = await query<DbClientRow>(
    `UPDATE clients 
     SET status = 'ACTIVE', archived_at = NULL, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 RETURNING *`,
    [id]
  );
  await query(
    `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
     VALUES ($1, $2, $3, $4)`,
    ["clients", id, "UPDATE", JSON.stringify({ action: "REACTIVATE" })]
  );
  return mapClientRow(res.rows[0]);
}

export async function purgeClient(clientId: string): Promise<{
  success: boolean;
  purgedDocumentsCount: number;
  clientDeleted: boolean;
  message: string;
}> {
  return withTransaction(async (client) => {
    // 1. Verificar se o cliente existe
    const clientCheck = await client.query<DbClientRow>(`SELECT * FROM clients WHERE id = $1`, [clientId]);
    if (clientCheck.rows.length === 0) {
      throw new Error("Cliente não encontrado.");
    }
    const clientRecord = clientCheck.rows[0];

    // 2. Coletar todos os contratos do cliente
    const contractsRes = await client.query<{ id: string }>(`SELECT id FROM contracts WHERE client_id = $1`, [clientId]);
    const contractIds = contractsRes.rows.map((r) => r.id);

    // 3. Coletar todas as propostas do cliente
    const proposalsRes = await client.query<{ id: string }>(`SELECT id FROM proposals WHERE client_id = $1`, [clientId]);
    const proposalIds = proposalsRes.rows.map((r) => r.id);

    // 4. Coletar todos os projetos do cliente
    const projectsRes = await client.query<{ id: string }>(`SELECT id FROM projects WHERE client_id = $1`, [clientId]);
    const projectIds = projectsRes.rows.map((r) => r.id);

    // 5. Coletar todos os documentos a serem purgados (arquivos pesados)
    const docIdsToPurge: string[] = [];

    // Docs do cliente
    const clientDocsRes = await client.query<{ document_id: string }>(
      `SELECT document_id FROM document_links WHERE entity_type = 'CLIENT' AND entity_id = $1`,
      [clientId]
    );
    docIdsToPurge.push(...clientDocsRes.rows.map((r) => r.document_id));

    // Docs dos contratos e versões de contratos
    if (contractIds.length > 0) {
      const contractDocsRes = await client.query<{ document_id: string }>(
        `SELECT document_id FROM document_links 
         WHERE (entity_type = 'CONTRACT' AND entity_id = ANY($1::uuid[]))
            OR (entity_type = 'CONTRACT_VERSION' AND entity_id IN (SELECT id FROM contract_versions WHERE contract_id = ANY($1::uuid[])))`,
        [contractIds]
      );
      docIdsToPurge.push(...contractDocsRes.rows.map((r) => r.document_id));
    }

    // Docs das propostas e versões
    if (proposalIds.length > 0) {
      const propDocsRes = await client.query<{ document_id: string }>(
        `SELECT document_id FROM document_links 
         WHERE (entity_type = 'PROPOSAL' AND entity_id = ANY($1::uuid[]))
            OR (entity_type = 'PROPOSAL_VERSION' AND entity_id IN (SELECT id FROM proposal_versions WHERE proposal_id = ANY($1::uuid[])))`,
        [proposalIds]
      );
      docIdsToPurge.push(...propDocsRes.rows.map((r) => r.document_id));
    }

    // Docs dos projetos e tarefas
    if (projectIds.length > 0) {
      const prjDocsRes = await client.query<{ document_id: string }>(
        `SELECT document_id FROM document_links 
         WHERE (entity_type = 'PROJECT' AND entity_id = ANY($1::uuid[]))
            OR (entity_type = 'TASK' AND entity_id IN (SELECT id FROM project_tasks WHERE project_id = ANY($1::uuid[])))`,
        [projectIds]
      );
      docIdsToPurge.push(...prjDocsRes.rows.map((r) => r.document_id));
    }

    // 6. Purgar documentos fisicamente do storage e payloads binários
    const purgedDocumentsCount = await DocumentService.purgeDocumentsByIds(docIdsToPurge, client);

    // Limpar pastas e placements de documentos do cliente
    await client.query(`DELETE FROM client_document_placements WHERE client_id = $1`, [clientId]).catch(() => {});
    await client.query(`DELETE FROM client_document_folders WHERE client_id = $1`, [clientId]).catch(() => {});

    // 7. Limpar dados do Estúdio de Conteúdo / Redes Sociais do cliente
    await client.query(`DELETE FROM content_calendar_items WHERE client_id = $1`, [clientId]).catch(() => {});
    await client.query(`DELETE FROM client_editorial_lines WHERE client_id = $1`, [clientId]).catch(() => {});
    await client.query(`DELETE FROM client_brand_voice_presets WHERE client_id = $1`, [clientId]).catch(() => {});
    await client.query(`DELETE FROM client_audiences WHERE client_id = $1`, [clientId]).catch(() => {});
    await client.query(`DELETE FROM client_identities WHERE client_id = $1`, [clientId]).catch(() => {});
    await client.query(`DELETE FROM client_briefing_sessions WHERE client_id = $1`, [clientId]).catch(() => {});

    // 8. Limpar projetos
    if (projectIds.length > 0) {
      await client.query(`DELETE FROM client_briefing_sessions WHERE project_id = ANY($1::uuid[])`, [projectIds]).catch(() => {});
      await client.query(`DELETE FROM project_time_entries WHERE project_id = ANY($1::uuid[])`, [projectIds]).catch(() => {});
      await client.query(
        `DELETE FROM project_checklists WHERE task_id IN (SELECT id FROM project_tasks WHERE project_id = ANY($1::uuid[]))`,
        [projectIds]
      ).catch(() => {});
      await client.query(`DELETE FROM project_tasks WHERE project_id = ANY($1::uuid[])`, [projectIds]).catch(() => {});
      await client.query(`DELETE FROM project_stages WHERE project_id = ANY($1::uuid[])`, [projectIds]).catch(() => {});
      await client.query(`DELETE FROM projects WHERE id = ANY($1::uuid[])`, [projectIds]).catch(() => {});
    }

    // 9. Limpar conversões e propostas
    await client.query(`DELETE FROM proposal_contract_conversions WHERE converted_client_id = $1`, [clientId]).catch(() => {});
    if (contractIds.length > 0) {
      await client.query(`DELETE FROM proposal_contract_conversions WHERE contract_id = ANY($1::uuid[])`, [contractIds]).catch(() => {});
    }
    if (proposalIds.length > 0) {
      await client.query(`DELETE FROM proposal_contract_conversions WHERE proposal_id = ANY($1::uuid[])`, [proposalIds]).catch(() => {});
      await client.query(`DELETE FROM proposal_events WHERE proposal_id = ANY($1::uuid[])`, [proposalIds]).catch(() => {});
      await client.query(
        `DELETE FROM proposal_items WHERE proposal_version_id IN (SELECT id FROM proposal_versions WHERE proposal_id = ANY($1::uuid[]))`,
        [proposalIds]
      ).catch(() => {});
      await client.query(`DELETE FROM proposal_versions WHERE proposal_id = ANY($1::uuid[])`, [proposalIds]);
      await client.query(`DELETE FROM proposals WHERE id = ANY($1::uuid[])`, [proposalIds]);
    }

    // 10. Verificar se existem títulos financeiros consolidados / pagos
    const paidSettlementsCheck = await client.query<{ count: string }>(
      `SELECT count(*) as count FROM financial_settlements s 
       JOIN receivables r ON r.id = s.receivable_id 
       WHERE r.client_id = $1 AND s.is_reversed = false AND s.settlement_type = 'RECEIPT'`,
      [clientId]
    );
    const hasPaidSettlements = Number(paidSettlementsCheck.rows[0]?.count || 0) > 0;

    if (hasPaidSettlements) {
      await client.query(`UPDATE contracts SET status = 'CANCELED' WHERE client_id = $1`, [clientId]);
      await client.query(
        `UPDATE clients SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [clientId]
      );
      await client.query(
        `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
         VALUES ($1, $2, $3, $4)`,
        ["clients", clientId, "UPDATE", JSON.stringify({ event: "PURGE_DOCUMENTS", name: clientRecord.name, purgedDocs: purgedDocumentsCount, reason: "FINANCIAL_HISTORY_PRESERVED" })]
      );

      return {
        success: true,
        purgedDocumentsCount,
        clientDeleted: false,
        message: `Todos os documentos, arquivos físicos e dados operacionais foram permanentemente excluídos (${purgedDocumentsCount} arquivos liberados). O registro cadastral foi arquivado para preservar a integridade contábil e fiscal do caixa.`,
      };
    }

    // Caso NÃO haja liquidações pagas:
    // 11. Limpar cobranças/receivables pendentes e agendamentos
    await client.query(
      `DELETE FROM receivable_items WHERE receivable_id IN (SELECT id FROM receivables WHERE client_id = $1)`,
      [clientId]
    ).catch(() => {});
    await client.query(
      `DELETE FROM financial_settlements WHERE receivable_id IN (SELECT id FROM receivables WHERE client_id = $1)`,
      [clientId]
    ).catch(() => {});
    await client.query(`DELETE FROM revenue_accruals WHERE client_id = $1`, [clientId]).catch(() => {});
    if (contractIds.length > 0) {
      await client.query(`DELETE FROM contract_billing_plans WHERE contract_id = ANY($1::uuid[])`, [contractIds]).catch(() => {});
      await client.query(`DELETE FROM revenue_accruals WHERE contract_id = ANY($1::uuid[])`, [contractIds]).catch(() => {});
      await client.query(
        `DELETE FROM contract_item_schedules WHERE contract_item_id IN (
          SELECT ci.id FROM contract_items ci 
          JOIN contract_versions cv ON cv.id = ci.contract_version_id 
          WHERE cv.contract_id = ANY($1::uuid[])
        )`,
        [contractIds]
      ).catch(() => {});
      await client.query(
        `DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id = ANY($1::uuid[]))`,
        [contractIds]
      ).catch(() => {});
      await client.query(`DELETE FROM contract_versions WHERE contract_id = ANY($1::uuid[])`, [contractIds]);
      await client.query(`DELETE FROM contracts WHERE id = ANY($1::uuid[])`, [contractIds]);
    }
    await client.query(`DELETE FROM receivables WHERE client_id = $1`, [clientId]);

    // 12. Limpar oportunidades CRM do cliente
    const crmOppsRes = await client.query<{ id: string }>(`SELECT id FROM crm_opportunities WHERE client_id = $1`, [clientId]);
    const crmOppIds = crmOppsRes.rows.map((r) => r.id);
    if (crmOppIds.length > 0) {
      await client.query(`DELETE FROM crm_opportunity_stages_history WHERE opportunity_id = ANY($1::uuid[])`, [crmOppIds]);
      await client.query(`DELETE FROM crm_activities WHERE opportunity_id = ANY($1::uuid[])`, [crmOppIds]);
      await client.query(`DELETE FROM crm_opportunities WHERE id = ANY($1::uuid[])`, [crmOppIds]);
    }

    // 13. Desvincular leads convertidos
    await client.query(`UPDATE crm_leads SET converted_client_id = NULL WHERE converted_client_id = $1`, [clientId]);

    // 14. Limpar contatos e histórico
    await client.query(`DELETE FROM client_activity_history WHERE client_id = $1`, [clientId]).catch(() => {});
    await client.query(`DELETE FROM client_contacts WHERE client_id = $1`, [clientId]);

    // 16. Excluir o cliente definitivamente
    await client.query(`DELETE FROM clients WHERE id = $1`, [clientId]);

    // 17. Auditoria
    await client.query(
      `INSERT INTO audit_logs (entity_name, entity_id, action, new_data)
       VALUES ($1, $2, $3, $4)`,
      ["clients", clientId, "DELETE", JSON.stringify({ event: "PURGE_COMPLETE", name: clientRecord.name, purgedDocs: purgedDocumentsCount })]
    );

    return {
      success: true,
      purgedDocumentsCount,
      clientDeleted: true,
      message: `Cliente e todos os seus documentos foram excluídos permanentemente (${purgedDocumentsCount} arquivos liberados).`,
    };
  });
}
