import type { PoolClient } from "pg";
import { ServicePresentationSchema, type ServicePresentation } from "@/modules/catalog/presentation";
import { query, withTransaction } from "@/lib/db/pool";
import {
  ProposalRecord,
  ProposalVersionRecord,
  ProposalItemRecord,
  ProposalEventRecord,
  ProposalConversionRecord,
  CreateProposalInput,
  CreateProposalVersionInput,
  ApproveProposalInput,
  RejectProposalInput,
  CancelProposalInput,
  ConvertProposalToContractInput,
  ProposalStatus,
  ProposalVersionStatus,
  ProposalPeriodicity,
  ProposalMetrics,
} from "./types";
import { createContract, getContractById } from "@/modules/contracts/service";
import type { ContractRecord } from "@/modules/contracts/types";

// Helpers para normalização monetária e cálculos determinísticos
function toCents(amount: number): number {
  return Math.round((amount || 0) * 100);
}

function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

interface DbProposalRow {
  id: string;
  proposal_code: string;
  title: string;
  lead_id: string | null;
  client_id: string | null;
  opportunity_id: string | null;
  status: ProposalStatus;
  current_version_number: number;
  approved_version_number: number | null;
  approved_at: Date | null;
  approval_notes: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  canceled_at: Date | null;
  cancellation_reason: string | null;
  valid_until: string | Date;
  contract_id: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
  recipient_name?: string;
  recipient_document?: string | null;
  is_lead?: boolean;
  opportunity_title?: string | null;
  total_monthly_effective?: number | string | null;
  total_one_time_effective?: number | string | null;
}

interface DbProposalVersionRow {
  id: string;
  proposal_id: string;
  version_number: number;
  version_status: ProposalVersionStatus;
  recipient_snapshot: Record<string, unknown>;
  commercial_terms_snapshot: Record<string, unknown>;
  subtotal_one_time: string | number;
  subtotal_monthly: string | number;
  subtotal_yearly: string | number;
  discount_total: string | number;
  total_one_time_effective: string | number;
  total_monthly_effective: string | number;
  total_yearly_effective: string | number;
  estimated_one_time_cost: string | number;
  estimated_monthly_cost: string | number;
  estimated_yearly_cost: string | number;
  created_at: Date;
  approved_at: Date | null;
}

interface DbProposalItemRow {
  id: string;
  proposal_version_id: string;
  source_type: "SERVICE" | "COMBO";
  service_id: string;
  service_name: string;
  combo_id: string | null;
  combo_name: string | null;
  description_snapshot: string | null;
  periodicity: ProposalPeriodicity;
  quantity: string | number;
  reference_unit_price: string | number;
  negotiated_unit_price: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  unit_cost: string | number;
  total_cost: string | number;
  supplier_id: string | null;
  supplier_name_snapshot: string | null;
  cost_periodicity: string;
  display_order: number;
  created_at: Date;
}

function mapProposalRow(row: DbProposalRow): ProposalRecord {
  const validUntilStr =
    typeof row.valid_until === "string"
      ? row.valid_until.slice(0, 10)
      : row.valid_until instanceof Date
      ? row.valid_until.toISOString().slice(0, 10)
      : "";

  return {
    id: row.id,
    proposalCode: row.proposal_code,
    title: row.title,
    leadId: row.lead_id,
    clientId: row.client_id,
    opportunityId: row.opportunity_id,
    status: row.status,
    currentVersionNumber: row.current_version_number,
    versionNumber: row.current_version_number,
    approvedVersionNumber: row.approved_version_number,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
    approvalNotes: row.approval_notes,
    rejectedAt: row.rejected_at ? row.rejected_at.toISOString() : null,
    rejectionReason: row.rejection_reason,
    canceledAt: row.canceled_at ? row.canceled_at.toISOString() : null,
    cancellationReason: row.cancellation_reason,
    validUntil: validUntilStr,
    contractId: row.contract_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    archivedAt: row.archived_at ? row.archived_at.toISOString() : null,
    recipientName: row.recipient_name,
    recipientDocument: row.recipient_document,
    isLead: row.is_lead,
    opportunityTitle: row.opportunity_title,
  };
}

function mapVersionRow(row: DbProposalVersionRow, items: ProposalItemRecord[] = []): ProposalVersionRecord {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    versionNumber: row.version_number,
    versionStatus: row.version_status,
    recipientSnapshot: row.recipient_snapshot as unknown as ProposalVersionRecord["recipientSnapshot"],
    commercialTermsSnapshot: row.commercial_terms_snapshot as unknown as ProposalVersionRecord["commercialTermsSnapshot"],
    subtotalOneTime: Number(row.subtotal_one_time),
    subtotalMonthly: Number(row.subtotal_monthly),
    subtotalYearly: Number(row.subtotal_yearly),
    discountTotal: Number(row.discount_total),
    totalOneTimeEffective: Number(row.total_one_time_effective),
    totalMonthlyEffective: Number(row.total_monthly_effective),
    totalYearlyEffective: Number(row.total_yearly_effective),
    estimatedOneTimeCost: Number(row.estimated_one_time_cost),
    estimatedMonthlyCost: Number(row.estimated_monthly_cost),
    estimatedYearlyCost: Number(row.estimated_yearly_cost),
    items,
    createdAt: row.created_at.toISOString(),
    approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
  };
}

function mapItemRow(row: DbProposalItemRow): ProposalItemRecord {
  return {
    id: row.id,
    proposalVersionId: row.proposal_version_id,
    sourceType: row.source_type,
    serviceId: row.service_id,
    serviceName: row.service_name,
    comboId: row.combo_id,
    comboName: row.combo_name,
    descriptionSnapshot: row.description_snapshot,
    periodicity: row.periodicity,
    quantity: Number(row.quantity),
    referenceUnitPrice: Number(row.reference_unit_price),
    negotiatedUnitPrice: Number(row.negotiated_unit_price),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost),
    supplierId: row.supplier_id,
    supplierNameSnapshot: row.supplier_name_snapshot,
    costPeriodicity: row.cost_periodicity || "MONTHLY",
    displayOrder: row.display_order,
    createdAt: row.created_at.toISOString(),
  };
}

export class ProposalService {
  /**
   * Listar propostas com filtros avançados
   */
  static async listProposals(filters: {
    status?: ProposalStatus;
    search?: string;
    clientId?: string;
    leadId?: string;
    opportunityId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: ProposalRecord[]; total: number }> {
    const conditions: string[] = ["p.archived_at IS NULL"];
    const params: unknown[] = [];
    let pIdx = 1;

    if (filters.status) {
      conditions.push(`p.status = $${pIdx++}`);
      params.push(filters.status);
    }

    if (filters.clientId) {
      conditions.push(`(p.client_id = ${pIdx} OR p.lead_id IN (SELECT id FROM crm_leads WHERE converted_client_id = ${pIdx}))`);
      params.push(filters.clientId);
      pIdx++;
    }

    if (filters.leadId) {
      conditions.push(`p.lead_id = $${pIdx++}`);
      params.push(filters.leadId);
    }

    if (filters.opportunityId) {
      conditions.push(`p.opportunity_id = $${pIdx++}`);
      params.push(filters.opportunityId);
    }

    if (filters.startDate) {
      conditions.push(`p.created_at >= $${pIdx++}::date`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`p.created_at <= ($${pIdx++}::date + interval '1 day')`);
      params.push(filters.endDate);
    }

    if (filters.search) {
      conditions.push(`(
        p.proposal_code ILIKE $${pIdx} OR 
        p.title ILIKE $${pIdx} OR 
        c.name ILIKE $${pIdx} OR 
        l.name ILIKE $${pIdx}
      )`);
      params.push(`%${filters.search}%`);
      pIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(*)::int AS count
      FROM proposals p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN crm_leads l ON l.id = p.lead_id
      ${whereClause}
    `;
    const countRes = await query<{ count: number }>(countSql, params);
    const total = countRes.rows[0]?.count || 0;

    const limit = filters.limit ? Math.min(filters.limit, 100) : 50;
    const offset = filters.offset || 0;

    const listSql = `
      SELECT 
        p.*,
        pv.total_monthly_effective,
        pv.total_one_time_effective,
        COALESCE(c.name, l.name) AS recipient_name,
        COALESCE(c.document, l.document) AS recipient_document,
        (p.lead_id IS NOT NULL AND p.client_id IS NULL) AS is_lead,
        opp.title AS opportunity_title
      FROM proposals p
      LEFT JOIN proposal_versions pv ON pv.proposal_id = p.id AND pv.version_number = p.current_version_number
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN crm_leads l ON l.id = p.lead_id
      LEFT JOIN crm_opportunities opp ON opp.id = p.opportunity_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
    params.push(limit, offset);

    const listRes = await query<DbProposalRow>(listSql, params);
    return {
      proposals: listRes.rows.map(mapProposalRow),
      total,
    };
  }

  /**
   * Buscar proposta completa por ID (incluindo versões, itens e timeline)
   */
  static async getProposalById(id: string, client?: { query: typeof query }): Promise<ProposalRecord | null> {
    const db = client || { query };
    const propSql = `
      SELECT 
        p.*,
        COALESCE(c.name, l.name) AS recipient_name,
        COALESCE(c.document, l.document) AS recipient_document,
        (p.lead_id IS NOT NULL AND p.client_id IS NULL) AS is_lead,
        opp.title AS opportunity_title
      FROM proposals p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN crm_leads l ON l.id = p.lead_id
      LEFT JOIN crm_opportunities opp ON opp.id = p.opportunity_id
      WHERE p.id = $1 AND p.archived_at IS NULL
    `;
    const propRes = await db.query<DbProposalRow>(propSql, [id]);
    if (!propRes.rows[0]) return null;

    const proposal = mapProposalRow(propRes.rows[0]);

    // Buscar versões
    const verSql = `
      SELECT * FROM proposal_versions 
      WHERE proposal_id = $1 
      ORDER BY version_number DESC
    `;
    const verRes = await db.query<DbProposalVersionRow>(verSql, [id]);

    // Buscar itens de todas as versões
    const itemsSql = `
      SELECT i.* 
      FROM proposal_items i
      JOIN proposal_versions v ON v.id = i.proposal_version_id
      WHERE v.proposal_id = $1
      ORDER BY i.display_order ASC, i.created_at ASC
    `;
    const itemsRes = await db.query<DbProposalItemRow>(itemsSql, [id]);
    const itemsByVersion = new Map<string, ProposalItemRecord[]>();
    for (const row of itemsRes.rows) {
      const item = mapItemRow(row);
      const list = itemsByVersion.get(item.proposalVersionId) || [];
      list.push(item);
      itemsByVersion.set(item.proposalVersionId, list);
    }

    const versions = verRes.rows.map((vr) => mapVersionRow(vr, itemsByVersion.get(vr.id) || []));
    proposal.versions = versions;
    proposal.currentVersion = versions.find((v) => v.versionNumber === proposal.currentVersionNumber) || versions[0];

    // Buscar eventos
    const evSql = `
      SELECT * FROM proposal_events 
      WHERE proposal_id = $1 
      ORDER BY created_at DESC
    `;
    const evRes = await db.query<{
      id: string;
      proposal_id: string;
      proposal_version_id: string | null;
      event_type: string;
      previous_state: string | null;
      new_state: string | null;
      details: Record<string, unknown>;
      actor_id: string | null;
      actor_name: string | null;
      created_at: Date;
    }>(evSql, [id]);

    proposal.events = evRes.rows.map((e) => ({
      id: e.id,
      proposalId: e.proposal_id,
      proposalVersionId: e.proposal_version_id,
      eventType: e.event_type,
      previousState: e.previous_state,
      newState: e.new_state,
      details: e.details || {},
      actorId: e.actor_id,
      actorName: e.actor_name,
      createdAt: e.created_at.toISOString(),
    }));

    // Buscar conversões
    const convSql = `
      SELECT pc.*, c.contract_number
      FROM proposal_contract_conversions pc
      JOIN contracts c ON c.id = pc.contract_id
      WHERE pc.proposal_id = $1
      ORDER BY pc.created_at DESC
    `;
    const convRes = await db.query<{
      id: string;
      proposal_id: string;
      proposal_version_id: string;
      contract_id: string;
      converted_client_id: string;
      periodicity: ProposalPeriodicity;
      idempotency_key: string;
      created_at: Date;
      contract_number?: string;
    }>(convSql, [id]);

    proposal.conversions = convRes.rows.map((c) => ({
      id: c.id,
      proposalId: c.proposal_id,
      proposalVersionId: c.proposal_version_id,
      contractId: c.contract_id,
      convertedClientId: c.converted_client_id,
      periodicity: c.periodicity,
      idempotencyKey: c.idempotency_key,
      createdAt: c.created_at.toISOString(),
      contractNumber: c.contract_number,
    }));

    return proposal;
  }

  /**
   * Criar nova proposta comercial (com versão 1 inicial)
   */
  static async createProposal(input: CreateProposalInput): Promise<ProposalRecord> {
    return withTransaction(async (client) => {
      // 1. Snapshot do Destinatário
      let recipientSnapshot: ProposalVersionRecord["recipientSnapshot"];
      if (input.clientId) {
        const cRes = await client.query<{
          id: string;
          name: string;
          trade_name: string | null;
          document: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          city: string | null;
          state: string | null;
        }>(`SELECT * FROM clients WHERE id = $1`, [input.clientId]);
        if (!cRes.rows[0]) throw new Error("Cliente selecionado não foi encontrado.");
        const c = cRes.rows[0];
        recipientSnapshot = {
          id: c.id,
          isLead: false,
          name: c.name,
          tradeName: c.trade_name,
          document: c.document,
          email: c.email,
          phone: c.phone || c.whatsapp,
          city: c.city,
          state: c.state,
        };
      } else if (input.leadId) {
        const lRes = await client.query<{
          id: string;
          name: string;
          trade_name: string | null;
          document: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          segment: string | null;
          city: string | null;
          state: string | null;
        }>(`SELECT * FROM crm_leads WHERE id = $1`, [input.leadId]);
        if (!lRes.rows[0]) throw new Error("Lead selecionado não foi encontrado.");
        const l = lRes.rows[0];
        recipientSnapshot = {
          id: l.id,
          isLead: true,
          name: l.name,
          tradeName: l.trade_name,
          document: l.document,
          email: l.email,
          phone: l.phone || l.whatsapp,
          segment: l.segment,
          city: l.city,
          state: l.state,
        };
      } else {
        throw new Error("A proposta deve estar vinculada a um Lead ou Cliente.");
      }

      // 2. Criar registro principal da proposta
      const insertPropSql = `
        INSERT INTO proposals (
          title, lead_id, client_id, opportunity_id,
          status, current_version_number, valid_until
        ) VALUES ($1, $2, $3, $4, 'DRAFT', 1, $5)
        RETURNING *
      `;
      const propRes = await client.query<DbProposalRow>(insertPropSql, [
        input.title.trim(),
        input.leadId || null,
        input.clientId || null,
        input.opportunityId || null,
        input.validUntil,
      ]);
      const proposalDb = propRes.rows[0];

      // 3. Processar itens, catálogo e custos
      const processed = await this.computeVersionTotalsAndItems(client, input.items, input.globalDiscount);

      // 4. Inserir Versão 1
      const presentationRows = await client.query<{ id: string; description?: string | null; presentation?: ServicePresentation }>(
        "SELECT id, description, presentation FROM services WHERE id = ANY($1::uuid[])",
        [input.items.map((item) => item.serviceId)]
      );
      const servicePresentations = Object.fromEntries(presentationRows.rows.map((row) => [row.id, ServicePresentationSchema.parse({ ...row.presentation, overview: row.presentation?.overview || row.description || "" })]));
      const commercialTerms = {
        servicePresentations,
        validUntil: input.validUntil,
        paymentTerms: input.paymentTerms?.trim() || null,
        startLeadTimeDays: input.startLeadTimeDays || 5,
        scopeDescription: input.scopeDescription?.trim() || null,
        clientNotes: input.clientNotes?.trim() || null,
        internalNotes: input.internalNotes?.trim() || null,
      };

      const insertVerSql = `
        INSERT INTO proposal_versions (
          proposal_id, version_number, version_status,
          recipient_snapshot, commercial_terms_snapshot,
          subtotal_one_time, subtotal_monthly, subtotal_yearly,
          discount_total,
          total_one_time_effective, total_monthly_effective, total_yearly_effective,
          estimated_one_time_cost, estimated_monthly_cost, estimated_yearly_cost
        ) VALUES ($1, 1, 'DRAFT', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const verRes = await client.query<DbProposalVersionRow>(insertVerSql, [
        proposalDb.id,
        JSON.stringify(recipientSnapshot),
        JSON.stringify(commercialTerms),
        processed.subtotalOneTime,
        processed.subtotalMonthly,
        processed.subtotalYearly,
        processed.discountTotal,
        processed.totalOneTimeEffective,
        processed.totalMonthlyEffective,
        processed.totalYearlyEffective,
        processed.estimatedOneTimeCost,
        processed.estimatedMonthlyCost,
        processed.estimatedYearlyCost,
      ]);
      const versionDb = verRes.rows[0];

      // 5. Inserir Itens
      for (const it of processed.computedItems) {
        const itemSql = `
          INSERT INTO proposal_items (
            proposal_version_id, source_type, service_id, service_name,
            combo_id, combo_name, description_snapshot, periodicity,
            quantity, reference_unit_price, negotiated_unit_price, discount_amount,
            total_amount, unit_cost, total_cost, supplier_id, supplier_name_snapshot,
            cost_periodicity, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `;
        await client.query(itemSql, [
          versionDb.id,
          it.sourceType,
          it.serviceId,
          it.serviceName,
          it.comboId,
          it.comboName,
          it.descriptionSnapshot,
          it.periodicity,
          it.quantity,
          it.referenceUnitPrice,
          it.negotiatedUnitPrice,
          it.discountAmount,
          it.totalAmount,
          it.unitCost,
          it.totalCost,
          it.supplierId,
          it.supplierNameSnapshot,
          it.costPeriodicity,
          it.displayOrder,
        ]);
      }

      // 6. Registrar evento na linha do tempo
      const eventSql = `
        INSERT INTO proposal_events (
          proposal_id, proposal_version_id, event_type,
          new_state, details, actor_id, actor_name
        ) VALUES ($1, $2, 'CREATED', 'DRAFT', $3, $4, $5)
      `;
      await client.query(eventSql, [
        proposalDb.id,
        versionDb.id,
        JSON.stringify({
          initialVersion: 1,
          totalMonthly: processed.totalMonthlyEffective,
          totalOneTime: processed.totalOneTimeEffective,
        }),
        input.actorId || null,
        input.actorName || "Administrador",
      ]);

      // 7. Se vinculado a oportunidade, registrar o proposal_id
      if (input.opportunityId) {
        await client.query(
          `UPDATE crm_opportunities SET proposal_id = $1, updated_at = NOW() WHERE id = $2`,
          [proposalDb.id, input.opportunityId]
        );
      }

      return (await this.getProposalById(proposalDb.id, client))!;
    });
  }

  /**
   * Criar nova versão de uma proposta existente (comversionamento imutável)
   */
  static async createProposalVersion(input: CreateProposalVersionInput): Promise<ProposalRecord> {
    return withTransaction(async (client) => {
      const propRes = await client.query<DbProposalRow>(
        `SELECT * FROM proposals WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
        [input.proposalId]
      );
      if (!propRes.rows[0]) throw new Error("Proposta comercial não encontrada.");
      const prop = propRes.rows[0];

      if (prop.status === "APPROVED" || prop.status === "CANCELED") {
        throw new Error(
          `Não é permitido criar nova versão para proposta com status '${prop.status}'. Propostas aprovadas ou canceladas são imutáveis.`
        );
      }

      const nextVersionNumber = prop.current_version_number + 1;

      // Buscar versão anterior para copiar snapshot do destinatário e termos caso não informados
      const prevVerRes = await client.query<DbProposalVersionRow>(
        `SELECT * FROM proposal_versions WHERE proposal_id = $1 AND version_number = $2`,
        [prop.id, prop.current_version_number]
      );
      const prevVer = prevVerRes.rows[0];
      if (!prevVer) throw new Error("Versão anterior não encontrada.");

      // Atualizar status da versão anterior se estava em DRAFT ou SENT
      await client.query(
        `UPDATE proposal_versions SET version_status = 'SUPERSEDED' WHERE id = $1`,
        [prevVer.id]
      );

      // Calcular novos totais e itens
      const processed = await this.computeVersionTotalsAndItems(client, input.items, input.globalDiscount);

      const recipientSnapshot = prevVer.recipient_snapshot;
      const prevTerms = prevVer.commercial_terms_snapshot as unknown as ProposalVersionRecord["commercialTermsSnapshot"];

      const presentationRows = await client.query<{ id: string; description?: string | null; presentation?: ServicePresentation }>(
        "SELECT id, description, presentation FROM services WHERE id = ANY($1::uuid[])",
        [input.items.map((item) => item.serviceId)]
      );
      const servicePresentations = Object.fromEntries(presentationRows.rows.map((row) => [row.id, ServicePresentationSchema.parse({ ...row.presentation, overview: row.presentation?.overview || row.description || "" })]));
      const commercialTerms = {
        servicePresentations,
        validUntil: input.validUntil || prop.valid_until,
        paymentTerms: input.paymentTerms !== undefined ? input.paymentTerms : prevTerms.paymentTerms,
        startLeadTimeDays:
          input.startLeadTimeDays !== undefined ? input.startLeadTimeDays : prevTerms.startLeadTimeDays,
        scopeDescription:
          input.scopeDescription !== undefined ? input.scopeDescription : prevTerms.scopeDescription,
        clientNotes: input.clientNotes !== undefined ? input.clientNotes : prevTerms.clientNotes,
        internalNotes: input.internalNotes !== undefined ? input.internalNotes : prevTerms.internalNotes,
      };

      // Inserir nova versão
      const insertVerSql = `
        INSERT INTO proposal_versions (
          proposal_id, version_number, version_status,
          recipient_snapshot, commercial_terms_snapshot,
          subtotal_one_time, subtotal_monthly, subtotal_yearly,
          discount_total,
          total_one_time_effective, total_monthly_effective, total_yearly_effective,
          estimated_one_time_cost, estimated_monthly_cost, estimated_yearly_cost
        ) VALUES ($1, $2, 'DRAFT', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      const verRes = await client.query<DbProposalVersionRow>(insertVerSql, [
        prop.id,
        nextVersionNumber,
        JSON.stringify(recipientSnapshot),
        JSON.stringify(commercialTerms),
        processed.subtotalOneTime,
        processed.subtotalMonthly,
        processed.subtotalYearly,
        processed.discountTotal,
        processed.totalOneTimeEffective,
        processed.totalMonthlyEffective,
        processed.totalYearlyEffective,
        processed.estimatedOneTimeCost,
        processed.estimatedMonthlyCost,
        processed.estimatedYearlyCost,
      ]);
      const versionDb = verRes.rows[0];

      // Inserir Itens
      for (const it of processed.computedItems) {
        const itemSql = `
          INSERT INTO proposal_items (
            proposal_version_id, source_type, service_id, service_name,
            combo_id, combo_name, description_snapshot, periodicity,
            quantity, reference_unit_price, negotiated_unit_price, discount_amount,
            total_amount, unit_cost, total_cost, supplier_id, supplier_name_snapshot,
            cost_periodicity, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `;
        await client.query(itemSql, [
          versionDb.id,
          it.sourceType,
          it.serviceId,
          it.serviceName,
          it.comboId,
          it.comboName,
          it.descriptionSnapshot,
          it.periodicity,
          it.quantity,
          it.referenceUnitPrice,
          it.negotiatedUnitPrice,
          it.discountAmount,
          it.totalAmount,
          it.unitCost,
          it.totalCost,
          it.supplierId,
          it.supplierNameSnapshot,
          it.costPeriodicity,
          it.displayOrder,
        ]);
      }

      // Atualizar proposta principal
      await client.query(
        `UPDATE proposals 
         SET current_version_number = $1, 
             title = COALESCE($2, title),
             valid_until = COALESCE($3, valid_until),
             status = 'DRAFT',
             updated_at = NOW() 
         WHERE id = $4`,
        [nextVersionNumber, input.title?.trim() || null, input.validUntil || null, prop.id]
      );

      // Evento de auditoria
      await client.query(
        `INSERT INTO proposal_events (
           proposal_id, proposal_version_id, event_type,
           previous_state, new_state, details, actor_id, actor_name
         ) VALUES ($1, $2, 'VERSION_CREATED', $3, 'DRAFT', $4, $5, $6)`,
        [
          prop.id,
          versionDb.id,
          prop.status,
          JSON.stringify({ versionNumber: nextVersionNumber }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      return (await this.getProposalById(prop.id, client))!;
    });
  }

  /**
   * Transição: Enviar Proposta ao Cliente
   */
  static async sendProposal(id: string, actor?: { id?: string; name?: string }): Promise<ProposalRecord> {
    return withTransaction(async (client) => {
      const propRes = await client.query<DbProposalRow>(
        `SELECT * FROM proposals WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
        [id]
      );
      if (!propRes.rows[0]) throw new Error("Proposta não encontrada.");
      const prop = propRes.rows[0];

      if (prop.status === "APPROVED" || prop.status === "CANCELED") {
        throw new Error(`Não é possível enviar proposta com status '${prop.status}'.`);
      }

      await client.query(
        `UPDATE proposals SET status = 'SENT', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      await client.query(
        `UPDATE proposal_versions 
         SET version_status = 'SENT' 
         WHERE proposal_id = $1 AND version_number = $2`,
        [id, prop.current_version_number]
      );

      await client.query(
        `INSERT INTO proposal_events (
           proposal_id, event_type, previous_state, new_state, details, actor_id, actor_name
         ) VALUES ($1, 'SENT', $2, 'SENT', '{}'::jsonb, $3, $4)`,
        [id, prop.status, actor?.id || null, actor?.name || "Administrador"]
      );

      return (await this.getProposalById(id, client))!;
    });
  }

  /**
   * Transição: Em Negociação
   */
  static async setNegotiating(
    id: string,
    notes?: string,
    actor?: { id?: string; name?: string }
  ): Promise<ProposalRecord> {
    return withTransaction(async (client) => {
      const propRes = await client.query<DbProposalRow>(
        `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!propRes.rows[0]) throw new Error("Proposta não encontrada.");
      const prop = propRes.rows[0];

      if (prop.status === "APPROVED" || prop.status === "CANCELED") {
        throw new Error(`Não é possível reabrir negociação em proposta '${prop.status}'.`);
      }

      await client.query(
        `UPDATE proposals SET status = 'NEGOTIATING', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      await client.query(
        `INSERT INTO proposal_events (
           proposal_id, event_type, previous_state, new_state, details, actor_id, actor_name
         ) VALUES ($1, 'NEGOTIATION_UPDATED', $2, 'NEGOTIATING', $3, $4, $5)`,
        [
          id,
          prop.status,
          JSON.stringify({ notes: notes || null }),
          actor?.id || null,
          actor?.name || "Administrador",
        ]
      );

      return (await this.getProposalById(id, client))!;
    });
  }

  /**
   * Aprovação Administrativa Explícita da Proposta
   * Congele a versão aprovada. NÃO gera contrato nem título financeiro automaticamente.
   */
  static async approveProposal(id: string, input: ApproveProposalInput, externalClient?: PoolClient): Promise<ProposalRecord> {
    const run = async (client: PoolClient) => {
      const propRes = await client.query<DbProposalRow>(
        `SELECT * FROM proposals WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
        [id]
      );
      if (!propRes.rows[0]) throw new Error("Proposta não encontrada.");
      const prop = propRes.rows[0];

      if (prop.status === "APPROVED") {
        return (await this.getProposalById(id, client))!;
      }
      if (prop.status === "CANCELED" || prop.status === "REJECTED") {
        throw new Error(`Não é possível aprovar proposta no estado '${prop.status}'.`);
      }

      const versionToApprove = input.approvedVersionNumber || prop.current_version_number;

      // Buscar versão
      const verRes = await client.query<DbProposalVersionRow>(
        `SELECT * FROM proposal_versions WHERE proposal_id = $1 AND version_number = $2`,
        [id, versionToApprove]
      );
      if (!verRes.rows[0]) {
        throw new Error(`Versão ${versionToApprove} não encontrada para aprovação.`);
      }

      // Atualizar proposta
      await client.query(
        `UPDATE proposals 
         SET status = 'APPROVED',
             approved_version_number = $1,
             approved_at = NOW(),
             approval_notes = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [versionToApprove, input.approvalNotes?.trim() || null, id]
      );

      // Congelar versão aprovada
      await client.query(
        `UPDATE proposal_versions 
         SET version_status = 'APPROVED', approved_at = NOW() 
         WHERE proposal_id = $1 AND version_number = $2`,
        [id, versionToApprove]
      );

      // Auditoria
      await client.query(
        `INSERT INTO proposal_events (
           proposal_id, proposal_version_id, event_type,
           previous_state, new_state, details, actor_id, actor_name
         ) VALUES ($1, $2, 'APPROVED', $3, 'APPROVED', $4, $5, $6)`,
        [
          id,
          verRes.rows[0].id,
          prop.status,
          JSON.stringify({
            approvedVersion: versionToApprove,
            notes: input.approvalNotes || null,
          }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      return (await this.getProposalById(id, client))!;
    };
    return externalClient ? run(externalClient) : withTransaction(run);
  }

  /**
   * Rejeição da Proposta (com motivo obrigatório)
   */
  static async rejectProposal(id: string, input: RejectProposalInput): Promise<ProposalRecord> {
    return withTransaction(async (client) => {
      const propRes = await client.query<DbProposalRow>(
        `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!propRes.rows[0]) throw new Error("Proposta não encontrada.");
      const prop = propRes.rows[0];

      if (prop.status === "APPROVED") {
        throw new Error("Propostas aprovadas não podem ser rejeitadas diretamente.");
      }

      await client.query(
        `UPDATE proposals 
         SET status = 'REJECTED',
             rejected_at = NOW(),
             rejection_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [input.reason.trim(), id]
      );

      await client.query(
        `UPDATE proposal_versions 
         SET version_status = 'REJECTED' 
         WHERE proposal_id = $1 AND version_number = $2`,
        [id, prop.current_version_number]
      );

      await client.query(
        `INSERT INTO proposal_events (
           proposal_id, event_type, previous_state, new_state, details, actor_id, actor_name
         ) VALUES ($1, 'REJECTED', $2, 'REJECTED', $3, $4, $5)`,
        [
          id,
          prop.status,
          JSON.stringify({ reason: input.reason.trim() }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      return (await this.getProposalById(id, client))!;
    });
  }

  /**
   * Cancelamento da Proposta (com justificativa)
   */
  static async cancelProposal(id: string, input: CancelProposalInput): Promise<ProposalRecord> {
    return withTransaction(async (client) => {
      const propRes = await client.query<DbProposalRow>(
        `SELECT * FROM proposals WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!propRes.rows[0]) throw new Error("Proposta não encontrada.");
      const prop = propRes.rows[0];

      await client.query(
        `UPDATE proposals 
         SET status = 'CANCELED',
             canceled_at = NOW(),
             cancellation_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [input.reason.trim(), id]
      );

      await client.query(
        `INSERT INTO proposal_events (
           proposal_id, event_type, previous_state, new_state, details, actor_id, actor_name
         ) VALUES ($1, 'CANCELED', $2, 'CANCELED', $3, $4, $5)`,
        [
          id,
          prop.status,
          JSON.stringify({ reason: input.reason.trim() }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      return (await this.getProposalById(id, client))!;
    });
  }

  /**
   * Conversão Transacional e Idempotente da Proposta Aprovada em Contrato(s)
   */
  static async convertToContract(
    id: string,
    input: ConvertProposalToContractInput,
    externalClient?: PoolClient
  ): Promise<{
    proposal: ProposalRecord;
    contracts: ContractRecord[];
    convertedClientId?: string;
  }> {
    const run = async (client: PoolClient) => {
      const propRes = await client.query<DbProposalRow>(
        `SELECT * FROM proposals WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
        [id]
      );
      if (!propRes.rows[0]) throw new Error("Proposta comercial não encontrada.");
      const prop = propRes.rows[0];

      if (prop.status !== "APPROVED" || !prop.approved_version_number) {
        throw new Error(
          "Somente propostas aprovadas podem ser convertidas em contrato. Aprove a proposta antes da conversão."
        );
      }

      // 1. Verificação de Idempotência
      const existingConv = await client.query<{
        contract_id: string;
        converted_client_id: string;
      }>(
        `SELECT DISTINCT pc.contract_id, pc.converted_client_id
         FROM proposal_contract_conversions pc
         WHERE pc.proposal_id = $1`,
        [id]
      );

      if (existingConv.rows.length > 0) {
        // Já convertido com esta chave de idempotência: retornar resultado existente
        const fullProposal = (await this.getProposalById(id, client))!;
        const existingContracts: ContractRecord[] = [];
        for (const row of existingConv.rows) {
          const c = await getContractById(row.contract_id);
          if (c) {
            existingContracts.push({
              ...c,
              billingPeriod: c.currentVersion?.billingPeriod,
            });
          }
        }
        return {
          proposal: fullProposal,
          contracts: existingContracts,
          convertedClientId: existingConv.rows[0].converted_client_id,
        };
      }

      // 2. Buscar versão aprovada e seus itens
      const verRes = await client.query<DbProposalVersionRow>(
        `SELECT * FROM proposal_versions WHERE proposal_id = $1 AND version_number = $2`,
        [id, prop.approved_version_number]
      );
      const version = verRes.rows[0];
      if (!version) throw new Error("Versão aprovada não foi encontrada no banco.");

      const itemsRes = await client.query<DbProposalItemRow>(
        `SELECT * FROM proposal_items WHERE proposal_version_id = $1 ORDER BY display_order ASC`,
        [version.id]
      );
      const items = itemsRes.rows.map(mapItemRow);
      if (items.length === 0) throw new Error("A versão aprovada não possui itens cadastrados.");

      // 3. Garantir Cliente Efetivo (Conversão Atômica de Lead -> Cliente se necessário)
      let effectiveClientId = prop.client_id;
      if (!effectiveClientId && prop.lead_id) {
        // Buscar lead
        const leadRes = await client.query<{
          id: string;
          person_type: "PF" | "PJ";
          name: string;
          trade_name: string | null;
          document: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          city: string | null;
          state: string | null;
          converted_client_id: string | null;
        }>(`SELECT * FROM crm_leads WHERE id = $1 FOR UPDATE`, [prop.lead_id]);
        const lead = leadRes.rows[0];
        if (!lead) throw new Error("Lead associado à proposta não foi encontrado.");

        if (lead.converted_client_id) {
          effectiveClientId = lead.converted_client_id;
        } else {
          // Verificar se já existe cliente com o mesmo documento para não duplicar
          let existingClient: { id: string } | null = null;
          if (lead.document) {
            const cleanDoc = lead.document.replace(/\D/g, "");
            const ecRes = await client.query<{ id: string }>(
              `SELECT id FROM clients WHERE document = $1 AND status = 'ACTIVE'`,
              [cleanDoc]
            );
            existingClient = ecRes.rows[0] || null;
          }

          if (existingClient) {
            effectiveClientId = existingClient.id;
          } else {
            // Criar novo cliente PJ/PF a partir dos dados do lead
            const newClientRes = await client.query<{ id: string }>(
              `INSERT INTO clients (
                type, name, trade_name, document, email, phone, whatsapp, city, state, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
              RETURNING id`,
              [
                lead.person_type,
                lead.name,
                lead.trade_name,
                lead.document ? lead.document.replace(/\D/g, "") : null,
                lead.email,
                lead.phone,
                lead.whatsapp,
                lead.city,
                lead.state,
              ]
            );
            effectiveClientId = newClientRes.rows[0].id;
          }

          // Marcar lead como CONVERTED
          await client.query(
            `UPDATE crm_leads 
             SET status = 'CONVERTED', converted_client_id = $1, converted_at = NOW(), updated_at = NOW() 
             WHERE id = $2`,
            [effectiveClientId, lead.id]
          );
        }

        // Vincular cliente à proposta
        await client.query(`UPDATE proposals SET client_id = $1, updated_at = NOW() WHERE id = $2`, [
          effectiveClientId,
          id,
        ]);
      }

      if (!effectiveClientId) {
        throw new Error("Não foi possível identificar o cliente de destino para o contrato.");
      }

      // 4. Agrupar itens por Periodicidade para respeitar estritamente o modelo de Contratos
      const periodicities: Array<ProposalPeriodicity | "MIXED"> = [new Set(items.map(i => i.periodicity)).size > 1 ? "MIXED" : items[0].periodicity];
      const createdContracts: ContractRecord[] = [];
      const nowStr = input.startDate || new Date().toISOString().slice(0, 10);
      let primaryContractId: string | null = null;

      for (const p of periodicities) {
        const periodItems = items;
        if (periodItems.length === 0) continue;

        const pIdempotencyKey = `${input.idempotencyKey}_${p}`;

        let contractTitle = prop.title;
        if (p === "ONE_TIME") {
          contractTitle = `${prop.title} (Implantação / Setup)`;
        } else if (p === "YEARLY") {
          contractTitle = `${prop.title} (Plano Anual)`;
        } else if (p === "MONTHLY") {
          contractTitle = `${prop.title} (Recorrência Mensal)`;
        }

        // Mapear itens para o contrato
        const contractInputItems = periodItems.map((pi) => ({
          serviceId: pi.serviceId,
          serviceName: pi.serviceName,
          comboId: pi.comboId,
          comboName: pi.comboName,
          quantity: pi.quantity,
          unitPrice: pi.totalAmount / pi.quantity,
          totalPrice: pi.totalAmount,
          periodicity: pi.periodicity,
          unitCost: pi.unitCost,
          supplierId: pi.supplierId,
          supplierNameSnapshot: pi.supplierNameSnapshot,
          costPeriodicity: (pi.costPeriodicity as "ONE_TIME" | "MONTHLY" | "YEARLY") || "MONTHLY",
        }));

        const newContract = await createContract(
          {
            clientId: effectiveClientId,
            status: "DRAFT",
            title: contractTitle,
            description: `Contrato gerado a partir da Proposta Comercial ${prop.proposal_code} (Versão ${version.version_number}).`,
            billingPeriod: p,
            dueDay: input.dueDay || 10,
            startDate: nowStr,
            endDate: undefined,
            isIndefinite: true, // Mensalidade por padrão contínua; avulsos possuem vigência no dia de execução/início
            items: contractInputItems,
            notes: `Origem: Proposta ${prop.proposal_code}.`,
          },
          client
        );

        // Atualizar referência de proposta no contrato
        await client.query(
          `UPDATE contracts 
           SET proposal_id = $1, proposal_code = $2 
           WHERE id = $3`,
          [id, prop.proposal_code, newContract.id]
        );

        // Gravar registro de conversão idempotente
        await client.query(
          `INSERT INTO proposal_contract_conversions (
             proposal_id, proposal_version_id, contract_id, converted_client_id,
             periodicity, idempotency_key
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, version.id, newContract.id, effectiveClientId, p, pIdempotencyKey]
        );

        createdContracts.push({
          ...newContract,
          billingPeriod: p,
        });

        if (!primaryContractId) {
          primaryContractId = newContract.id;
        }
      }

      // 5. Vincular contrato principal à proposta
      if (primaryContractId) {
        await client.query(
          `UPDATE proposals SET contract_id = $1, updated_at = NOW() WHERE id = $2`,
          [primaryContractId, id]
        );
      }

      // 6. Se vinculado a oportunidade CRM, marcá-la como WON e associar contrato
      if (prop.opportunity_id && primaryContractId) {
        const oppRow = await client.query<{ stage_id: string; status: string }>(
          `SELECT stage_id, status FROM crm_opportunities WHERE id = $1`,
          [prop.opportunity_id]
        );
        const prevStage = oppRow.rows[0]?.stage_id || null;
        const prevStatus = oppRow.rows[0]?.status || "OPEN";

        await client.query(
          `UPDATE crm_opportunities 
           SET status = 'WON', contract_id = $1, closed_at = NOW(), probability = 100, updated_at = NOW() 
           WHERE id = $2`,
          [primaryContractId, prop.opportunity_id]
        );

        await client.query(
          `INSERT INTO crm_opportunity_history (
             opportunity_id, from_stage_id, to_stage_id, from_status, to_status, notes, created_by
           ) VALUES ($1, $2, $2, $3, 'WON', $4, $5)`,
          [
            prop.opportunity_id,
            prevStage,
            prevStatus,
            `Oportunidade fechada como WON via conversão da Proposta Comercial ${prop.proposal_code}.`,
            input.actorName || "Administrador",
          ]
        );
      }

      // 7. Evento de auditoria
      await client.query(
        `INSERT INTO proposal_events (
           proposal_id, proposal_version_id, event_type,
           previous_state, new_state, details, actor_id, actor_name
         ) VALUES ($1, $2, 'CONVERTED_TO_CONTRACT', 'APPROVED', 'APPROVED', $3, $4, $5)`,
        [
          id,
          version.id,
          JSON.stringify({
            contracts: createdContracts,
            idempotencyKey: input.idempotencyKey,
            effectiveClientId,
          }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      const updatedProp = (await this.getProposalById(id, client))!;
      return {
        proposal: updatedProp,
        contracts: createdContracts,
        convertedClientId: effectiveClientId,
      };
    };
    return externalClient ? run(externalClient) : withTransaction(run);
  }

  /**
   * Cálculo determinístico puro de precificação e rateio de descontos em centavos
   */
  static calculatePricing(
    items: Array<{
      quantity: number;
      negotiatedUnitPrice: number;
      discountAmount?: number;
      periodicity: ProposalPeriodicity;
      unitCost?: number;
    }>,
    globalDiscount = 0
  ) {
    let subtotalOneTimeCents = 0;
    let subtotalMonthlyCents = 0;
    let subtotalYearlyCents = 0;
    let estimatedOneTimeCostCents = 0;
    let estimatedMonthlyCostCents = 0;
    let estimatedYearlyCostCents = 0;
    let itemsDiscountCents = 0;

    const baseItems = items.map((it) => {
      const qty = it.quantity > 0 ? it.quantity : 1;
      const negPriceCents = toCents(it.negotiatedUnitPrice);
      const itemDiscountCents = toCents(it.discountAmount || 0);
      const grossCents = Math.round(qty * negPriceCents);
      const netCents = Math.max(0, grossCents - itemDiscountCents);
      const uCostCents = toCents(it.unitCost || 0);
      const totalCostCents = Math.round(qty * uCostCents);

      itemsDiscountCents += itemDiscountCents;

      if (it.periodicity === "ONE_TIME") {
        subtotalOneTimeCents += netCents;
        estimatedOneTimeCostCents += totalCostCents;
      } else if (it.periodicity === "YEARLY") {
        subtotalYearlyCents += netCents;
        estimatedYearlyCostCents += totalCostCents;
      } else {
        subtotalMonthlyCents += netCents;
        estimatedMonthlyCostCents += totalCostCents;
      }

      return {
        ...it,
        quantity: qty,
        negotiatedUnitPrice: fromCents(negPriceCents),
        discountAmount: fromCents(itemDiscountCents),
        totalAmount: fromCents(netCents),
        unitCost: fromCents(uCostCents),
        totalCost: fromCents(totalCostCents),
        netCents,
      };
    });

    const initialSubtotalOneTimeCents = subtotalOneTimeCents;
    const initialSubtotalMonthlyCents = subtotalMonthlyCents;
    const initialSubtotalYearlyCents = subtotalYearlyCents;

    let effectiveOneTimeCents = subtotalOneTimeCents;
    let effectiveMonthlyCents = subtotalMonthlyCents;
    let effectiveYearlyCents = subtotalYearlyCents;

    const globalDiscountCents = toCents(globalDiscount);
    const totalDiscountCents = itemsDiscountCents + globalDiscountCents;

    let computedItems = baseItems;
    if (globalDiscountCents > 0) {
      const grossTotalCents = subtotalOneTimeCents + subtotalMonthlyCents + subtotalYearlyCents;
      if (grossTotalCents > 0) {
        let distributedCents = 0;
        computedItems = baseItems.map((it, idx) => {
          const isLast = idx === baseItems.length - 1;
          const share = isLast
            ? globalDiscountCents - distributedCents
            : Math.round((it.netCents / grossTotalCents) * globalDiscountCents);
          distributedCents += share;

          const finalItemNet = Math.max(0, it.netCents - share);
          const totalItemDiscount = toCents(it.discountAmount || 0) + share;

          return {
            ...it,
            discountAmount: fromCents(totalItemDiscount),
            totalAmount: fromCents(finalItemNet),
            netCents: finalItemNet,
          };
        });

        effectiveOneTimeCents = computedItems
          .filter((i) => i.periodicity === "ONE_TIME")
          .reduce((sum, i) => sum + i.netCents, 0);
        effectiveMonthlyCents = computedItems
          .filter((i) => i.periodicity === "MONTHLY")
          .reduce((sum, i) => sum + i.netCents, 0);
        effectiveYearlyCents = computedItems
          .filter((i) => i.periodicity === "YEARLY")
          .reduce((sum, i) => sum + i.netCents, 0);
      }
    }

    return {
      subtotalOneTime: fromCents(initialSubtotalOneTimeCents),
      subtotalMonthly: fromCents(initialSubtotalMonthlyCents),
      subtotalYearly: fromCents(initialSubtotalYearlyCents),
      discountTotal: fromCents(totalDiscountCents),
      totalOneTimeEffective: fromCents(effectiveOneTimeCents),
      totalMonthlyEffective: fromCents(effectiveMonthlyCents),
      totalYearlyEffective: fromCents(effectiveYearlyCents),
      estimatedOneTimeCost: fromCents(estimatedOneTimeCostCents),
      estimatedMonthlyCost: fromCents(estimatedMonthlyCostCents),
      estimatedYearlyCost: fromCents(estimatedYearlyCostCents),
      computedItems,
    };
  }

  /**
   * Helper Interno: Cálculo determinístico de totais e rateio de descontos em centavos
   */
  private static async computeVersionTotalsAndItems(
    client: { query: typeof query },
    itemsInput: CreateProposalInput["items"],
    globalDiscount = 0
  ) {
    if (!itemsInput.length) {
      throw new Error("A proposta deve conter ao menos um item de serviço.");
    }

    // Buscar informações de serviços para snapshots de custo e fornecedor padrão
    const serviceIds = itemsInput.map((i) => i.serviceId);
    const svcRes = await client.query<{
      id: string;
      name: string;
      default_price: string | number;
      default_cost: string | number;
      default_supplier_id: string | null;
      billing_unit: string;
    }>(`SELECT * FROM services WHERE id = ANY($1::uuid[])`, [serviceIds]);

    const serviceMap = new Map(svcRes.rows.map((s) => [s.id, s]));

    // Buscar fornecedores se informados
    const supplierIds = itemsInput
      .map((it) => it.supplierId || serviceMap.get(it.serviceId)?.default_supplier_id)
      .filter((id): id is string => Boolean(id));
    const supplierNameMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const supRes = await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM suppliers WHERE id = ANY($1::uuid[])`,
        [supplierIds]
      );
      supRes.rows.forEach((sp) => supplierNameMap.set(sp.id, sp.name));
    }

    let subtotalOneTimeCents = 0;
    let subtotalMonthlyCents = 0;
    let subtotalYearlyCents = 0;
    let estimatedOneTimeCostCents = 0;
    let estimatedMonthlyCostCents = 0;
    let estimatedYearlyCostCents = 0;
    let itemsDiscountCents = 0;

    const baseItems = itemsInput.map((it, idx) => {
      const sInfo = serviceMap.get(it.serviceId);
      const serviceName = it.serviceName?.trim() || sInfo?.name || "Serviço";
      const supplierId = it.supplierId || sInfo?.default_supplier_id || null;
      const supplierNameSnapshot =
        it.supplierNameSnapshot || (supplierId ? supplierNameMap.get(supplierId) : null) || null;

      const qty = (it.quantity && it.quantity > 0) ? Number(it.quantity) : 1;
      const refPriceCents = toCents(it.referenceUnitPrice);
      const negPriceCents = toCents(it.negotiatedUnitPrice);
      const itemDiscountCents = toCents(it.discountAmount || 0);

      const grossCents = Math.round(qty * negPriceCents);
      const netCents = Math.max(0, grossCents - itemDiscountCents);

      const uCostCents = toCents(it.unitCost || Number(sInfo?.default_cost || 0));
      const totalCostCents = Math.round(qty * uCostCents);

      itemsDiscountCents += itemDiscountCents;

      if (it.periodicity === "ONE_TIME") {
        subtotalOneTimeCents += netCents;
        estimatedOneTimeCostCents += totalCostCents;
      } else if (it.periodicity === "YEARLY") {
        subtotalYearlyCents += netCents;
        estimatedYearlyCostCents += totalCostCents;
      } else {
        subtotalMonthlyCents += netCents;
        estimatedMonthlyCostCents += totalCostCents;
      }

      return {
        sourceType: it.sourceType || "SERVICE",
        serviceId: it.serviceId,
        serviceName,
        comboId: it.comboId || null,
        comboName: it.comboName?.trim() || null,
        descriptionSnapshot: it.descriptionSnapshot?.trim() || it.description?.trim() || null,
        periodicity: it.periodicity,
        quantity: qty,
        referenceUnitPrice: fromCents(refPriceCents),
        negotiatedUnitPrice: fromCents(negPriceCents),
        discountAmount: fromCents(itemDiscountCents),
        totalAmount: fromCents(netCents),
        unitCost: fromCents(uCostCents),
        totalCost: fromCents(totalCostCents),
        supplierId,
        supplierNameSnapshot,
        costPeriodicity: it.costPeriodicity || "MONTHLY",
        displayOrder: it.displayOrder !== undefined ? it.displayOrder : idx,
        netCents,
      };
    });

    // Se houver desconto global adicional, ratear proporcionalmente entre os itens
    const globalDiscountCents = toCents(globalDiscount);
    const totalDiscountCents = itemsDiscountCents + globalDiscountCents;

    const initialSubtotalOneTimeCents = subtotalOneTimeCents;
    const initialSubtotalMonthlyCents = subtotalMonthlyCents;
    const initialSubtotalYearlyCents = subtotalYearlyCents;

    let effectiveOneTimeCents = subtotalOneTimeCents;
    let effectiveMonthlyCents = subtotalMonthlyCents;
    let effectiveYearlyCents = subtotalYearlyCents;

    let computedItems = baseItems;
    if (globalDiscountCents > 0) {
      const grossTotalCents = subtotalOneTimeCents + subtotalMonthlyCents + subtotalYearlyCents;
      if (grossTotalCents > 0) {
        let distributedCents = 0;
        computedItems = baseItems.map((it, idx) => {
          const isLast = idx === baseItems.length - 1;
          const share = isLast
            ? globalDiscountCents - distributedCents
            : Math.round((it.netCents / grossTotalCents) * globalDiscountCents);
          distributedCents += share;

          const finalItemNet = Math.max(0, it.netCents - share);
          const totalItemDiscount = toCents(it.discountAmount) + share;

          return {
            ...it,
            discountAmount: fromCents(totalItemDiscount),
            totalAmount: fromCents(finalItemNet),
            netCents: finalItemNet,
          };
        });

        effectiveOneTimeCents = computedItems
          .filter((i) => i.periodicity === "ONE_TIME")
          .reduce((sum, i) => sum + i.netCents, 0);
        effectiveMonthlyCents = computedItems
          .filter((i) => i.periodicity === "MONTHLY")
          .reduce((sum, i) => sum + i.netCents, 0);
        effectiveYearlyCents = computedItems
          .filter((i) => i.periodicity === "YEARLY")
          .reduce((sum, i) => sum + i.netCents, 0);
      }
    }

    return {
      subtotalOneTime: fromCents(initialSubtotalOneTimeCents),
      subtotalMonthly: fromCents(initialSubtotalMonthlyCents),
      subtotalYearly: fromCents(initialSubtotalYearlyCents),
      discountTotal: fromCents(totalDiscountCents),
      totalOneTimeEffective: fromCents(effectiveOneTimeCents),
      totalMonthlyEffective: fromCents(effectiveMonthlyCents),
      totalYearlyEffective: fromCents(effectiveYearlyCents),
      estimatedOneTimeCost: fromCents(estimatedOneTimeCostCents),
      estimatedMonthlyCost: fromCents(estimatedMonthlyCostCents),
      estimatedYearlyCost: fromCents(estimatedYearlyCostCents),
      computedItems,
    };
  }

  /**
   * Indicadores Executivos e KPIs do Módulo de Propostas para Dashboard & BI
   */
  static async getProposalMetrics(): Promise<ProposalMetrics & {
    draftCount: number;
    sentCount: number;
    negotiatingCount: number;
    approvedCount: number;
    rejectedCount: number;
    canceledCount: number;
    totalProposedMonthly: number;
    totalProposedOneTime: number;
    totalProposedYearly: number;
  }> {
    const statsSql = `
      SELECT 
        COUNT(*)::int AS total_proposals,
        COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::int AS draft_count,
        COUNT(CASE WHEN status = 'SENT' THEN 1 END)::int AS sent_count,
        COUNT(CASE WHEN status = 'NEGOTIATING' THEN 1 END)::int AS negotiating_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int AS approved_count,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int AS rejected_count,
        COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END)::int AS expired_count,
        COUNT(CASE WHEN status = 'CANCELED' THEN 1 END)::int AS canceled_count,
        COALESCE(AVG(CASE WHEN approved_at IS NOT NULL AND created_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400 ELSE NULL END), 0) AS avg_conversion_days
      FROM proposals 
      WHERE archived_at IS NULL
    `;
    const statsRes = await query<{
      total_proposals: number;
      draft_count: number;
      sent_count: number;
      negotiating_count: number;
      approved_count: number;
      rejected_count: number;
      expired_count: number;
      canceled_count: number;
      avg_conversion_days: string | number;
    }>(statsSql);
    const s = statsRes.rows[0];

    const valuesSql = `
      SELECT 
        COALESCE(SUM(v.total_monthly_effective), 0) AS proposed_monthly,
        COALESCE(SUM(v.total_one_time_effective), 0) AS proposed_one_time,
        COALESCE(SUM(v.total_yearly_effective), 0) AS proposed_yearly,
        COALESCE(SUM(CASE WHEN p.status = 'APPROVED' THEN v.total_monthly_effective ELSE 0 END), 0) AS approved_monthly,
        COALESCE(SUM(CASE WHEN p.status = 'APPROVED' THEN v.total_one_time_effective ELSE 0 END), 0) AS approved_one_time,
        COALESCE(SUM(CASE WHEN p.status = 'APPROVED' THEN v.total_yearly_effective ELSE 0 END), 0) AS approved_yearly
      FROM proposals p
      JOIN proposal_versions v ON v.proposal_id = p.id AND v.version_number = p.current_version_number
      WHERE p.archived_at IS NULL
    `;
    const valRes = await query<{
      proposed_monthly: string | number;
      proposed_one_time: string | number;
      proposed_yearly: string | number;
      approved_monthly: string | number;
      approved_one_time: string | number;
      approved_yearly: string | number;
    }>(valuesSql);
    const v = valRes.rows[0];

    const decided = (s.approved_count || 0) + (s.rejected_count || 0);
    const approvalRate = decided > 0 ? Number((((s.approved_count || 0) / decided) * 100).toFixed(1)) : 0;

    return {
      totalProposals: s.total_proposals || 0,
      totalDraft: s.draft_count || 0,
      draftCount: s.draft_count || 0,
      totalSent: s.sent_count || 0,
      sentCount: s.sent_count || 0,
      totalNegotiating: s.negotiating_count || 0,
      negotiatingCount: s.negotiating_count || 0,
      totalApproved: s.approved_count || 0,
      approvedCount: s.approved_count || 0,
      totalRejected: s.rejected_count || 0,
      rejectedCount: s.rejected_count || 0,
      totalExpired: s.expired_count || 0,
      totalCanceled: s.canceled_count || 0,
      canceledCount: s.canceled_count || 0,
      avgConversionDays: Number(Number(s.avg_conversion_days || 0).toFixed(1)),
      approvalRate,
      totalProposedMonthly: Number(v.proposed_monthly),
      totalProposedOneTime: Number(v.proposed_one_time),
      totalProposedYearly: Number(v.proposed_yearly),
      totalApprovedMonthly: Number(v.approved_monthly),
      totalApprovedOneTime: Number(v.approved_one_time),
      totalApprovedYearly: Number(v.approved_yearly),
    };
  }
}
