import { getDbPool } from "@/lib/db/pool";
import { normalizeDocument } from "@/shared/cpf-cnpj";
import {
  PersonType,
  LeadStatus,
  PipelineStatus,
  StageType,
  BillingPeriod,
  OpportunityStatus,
  ActivityType,
  ActivityStatus,
  LeadRecord,
  CreateLeadInput,
  UpdateLeadInput,
  ConvertLeadInput,
  PipelineRecord,
  PipelineStageRecord,
  CreatePipelineInput,
  UpdatePipelineInput,
  CreateStageInput,
  UpdateStageInput,
  OpportunityRecord,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  MoveOpportunityInput,
  CloseOpportunityInput,
  OpportunityHistoryRecord,
  ActivityRecord,
  CreateActivityInput,
  UpdateActivityInput,
  CrmKpiSummary,
} from "./types";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  ConvertLeadSchema,
  CreatePipelineSchema,
  UpdatePipelineSchema,
  CreateStageSchema,
  UpdateStageSchema,
  CreateOpportunitySchema,
  UpdateOpportunitySchema,
  MoveOpportunitySchema,
  CloseOpportunitySchema,
  CreateActivitySchema,
  UpdateActivitySchema,
} from "./schemas";

export function computeNormalizedMonthlyValue(billingPeriod: BillingPeriod, amount: number): number {
  if (billingPeriod === "MONTHLY") {
    return Number(amount.toFixed(2));
  }
  if (billingPeriod === "YEARLY") {
    return Number((amount / 12).toFixed(2));
  }
  // ONE_TIME não gera MRR potencial recorrente
  return 0;
}

export class CrmService {
  static computeNormalizedMonthlyValue(amount: number, billingPeriod: BillingPeriod): number;
  static computeNormalizedMonthlyValue(billingPeriod: BillingPeriod, amount: number): number;
  static computeNormalizedMonthlyValue(a: number | BillingPeriod, b: number | BillingPeriod): number {
    if (typeof a === "number" && typeof b === "string") {
      return computeNormalizedMonthlyValue(b as BillingPeriod, a);
    }
    return computeNormalizedMonthlyValue(a as BillingPeriod, b as number);
  }

  static convertLead = (input: ConvertLeadInput, auditUser?: string) => CrmService.convertLeadToClient(input, auditUser);
  static moveOpportunityStage = (input: MoveOpportunityInput, auditUser?: string) => CrmService.moveOpportunity(input, auditUser);
  static getOpportunityHistory = (oppId: string) => CrmService.listOpportunityHistory(oppId);
  static getCrmAnalytics = (pipelineId?: string) => CrmService.getCrmKpis(pipelineId);
  static async checkLeadDuplicate(document?: string | null, email?: string | null) {
    const res = await CrmService.checkDuplicateLead({ document, email });
    return {
      duplicate: res.hasDocumentDuplicate || res.hasContactWarning,
      lead: res.existingLeadId ? { id: res.existingLeadId } : null,
      message: res.duplicateMessage,
    };
  }
  // =========================================================================
  // 1. LEADS
  // =========================================================================

  static async listLeads(params?: {
    search?: string;
    status?: LeadStatus | "ALL";
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: LeadRecord[]; total: number }> {
    const pool = getDbPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.status && params.status !== "ALL") {
      conditions.push(`l.status = $${idx++}`);
      values.push(params.status);
    } else if (!params?.status) {
      conditions.push(`l.status <> 'ARCHIVED'`);
    }

    if (params?.source) {
      conditions.push(`l.source = $${idx++}`);
      values.push(params.source);
    }

    if (params?.search) {
      const cleanDoc = normalizeDocument(params.search);
      conditions.push(
        `(l.name ILIKE $${idx} OR l.trade_name ILIKE $${idx} OR l.lead_code ILIKE $${idx} OR l.email ILIKE $${idx} OR l.phone ILIKE $${idx} OR l.document ILIKE $${idx + 1})`
      );
      values.push(`%${params.search}%`, `%${cleanDoc || params.search}%`);
      idx += 2;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) as total FROM crm_leads l ${whereClause}`;
    const countRes = await pool.query<{ total: string }>(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const sql = `
      SELECT 
        l.id,
        l.lead_code,
        l.person_type,
        l.name,
        l.trade_name,
        l.document,
        l.email,
        l.phone,
        l.whatsapp,
        l.primary_contact,
        l.segment,
        l.city,
        l.state,
        l.source,
        l.notes,
        l.status,
        l.converted_client_id,
        l.converted_at,
        l.archived_at,
        l.created_at,
        l.updated_at,
        COUNT(o.id) as opportunities_count,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN o.amount ELSE 0 END), 0) as open_opps_amount
      FROM crm_leads l
      LEFT JOIN crm_opportunities o ON o.lead_id = l.id
      ${whereClause}
      GROUP BY l.id
      ORDER BY l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const res = await pool.query(sql, [...values, limit, offset]);

    const leads: LeadRecord[] = res.rows.map((r) => ({
      id: r.id,
      leadCode: r.lead_code,
      personType: r.person_type,
      name: r.name,
      tradeName: r.trade_name,
      document: r.document,
      email: r.email,
      phone: r.phone,
      whatsapp: r.whatsapp,
      primaryContact: r.primary_contact,
      segment: r.segment,
      city: r.city,
      state: r.state,
      source: r.source,
      notes: r.notes,
      status: r.status,
      convertedClientId: r.converted_client_id,
      convertedAt: r.converted_at?.toISOString?.() || r.converted_at,
      archivedAt: r.archived_at?.toISOString?.() || r.archived_at,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
      opportunitiesCount: parseInt(r.opportunities_count || "0", 10),
      openOpportunitiesAmount: Number(r.open_opps_amount || 0),
    }));

    return { leads, total };
  }

  static async getLeadById(id: string): Promise<LeadRecord | null> {
    const pool = getDbPool();
    const sql = `
      SELECT 
        l.id,
        l.lead_code,
        l.person_type,
        l.name,
        l.trade_name,
        l.document,
        l.email,
        l.phone,
        l.whatsapp,
        l.primary_contact,
        l.segment,
        l.city,
        l.state,
        l.source,
        l.notes,
        l.status,
        l.converted_client_id,
        l.converted_at,
        l.archived_at,
        l.created_at,
        l.updated_at,
        COUNT(o.id) as opportunities_count,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN o.amount ELSE 0 END), 0) as open_opps_amount
      FROM crm_leads l
      LEFT JOIN crm_opportunities o ON o.lead_id = l.id
      WHERE l.id = $1
      GROUP BY l.id
    `;
    const res = await pool.query(sql, [id]);
    if (res.rowCount === 0) return null;
    const r = res.rows[0];

    return {
      id: r.id,
      leadCode: r.lead_code,
      personType: r.person_type,
      name: r.name,
      tradeName: r.trade_name,
      document: r.document,
      email: r.email,
      phone: r.phone,
      whatsapp: r.whatsapp,
      primaryContact: r.primary_contact,
      segment: r.segment,
      city: r.city,
      state: r.state,
      source: r.source,
      notes: r.notes,
      status: r.status,
      convertedClientId: r.converted_client_id,
      convertedAt: r.converted_at?.toISOString?.() || r.converted_at,
      archivedAt: r.archived_at?.toISOString?.() || r.archived_at,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
      opportunitiesCount: parseInt(r.opportunities_count || "0", 10),
      openOpportunitiesAmount: Number(r.open_opps_amount || 0),
    };
  }

  static async checkDuplicateLead(params: {
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    excludeLeadId?: string;
  }): Promise<{
    hasDocumentDuplicate: boolean;
    hasContactWarning: boolean;
    duplicateMessage?: string;
    existingLeadId?: string;
    existingClientId?: string;
  }> {
    const pool = getDbPool();
    const cleanDoc = params.document ? normalizeDocument(params.document) : null;

    // 1. Checagem rígida de CPF/CNPJ se informado
    if (cleanDoc && cleanDoc.length > 0) {
      // Checa em leads
      let sqlLead = `SELECT id, name FROM crm_leads WHERE document = $1 AND status <> 'ARCHIVED'`;
      const leadParams: unknown[] = [cleanDoc];
      if (params.excludeLeadId) {
        sqlLead += ` AND id <> $2`;
        leadParams.push(params.excludeLeadId);
      }
      const leadRes = await pool.query(sqlLead, leadParams);
      if (leadRes.rowCount && leadRes.rowCount > 0) {
        return {
          hasDocumentDuplicate: true,
          hasContactWarning: false,
          duplicateMessage: `Já existe um lead cadastrado com este documento: "${leadRes.rows[0].name}".`,
          existingLeadId: leadRes.rows[0].id,
        };
      }

      // Checa em clientes já cadastrados
      const clientRes = await pool.query(
        `SELECT id, name FROM clients WHERE document = $1 AND status <> 'ARCHIVED'`,
        [cleanDoc]
      );
      if (clientRes.rowCount && clientRes.rowCount > 0) {
        return {
          hasDocumentDuplicate: true,
          hasContactWarning: true,
          duplicateMessage: `Este documento pertence ao cliente já cadastrado: "${clientRes.rows[0].name}".`,
          existingClientId: clientRes.rows[0].id,
        };
      }
    }

    // 2. Alerta de e-mail / telefone sem bloqueio indevido
    let hasContactWarning = false;
    let duplicateMessage: string | undefined;

    if (params.email && params.email.trim() !== "") {
      const emailRes = await pool.query(
        `SELECT id, name FROM crm_leads WHERE email ILIKE $1 AND status <> 'ARCHIVED' LIMIT 1`,
        [params.email.trim()]
      );
      if (emailRes.rowCount && emailRes.rowCount > 0 && emailRes.rows[0].id !== params.excludeLeadId) {
        hasContactWarning = true;
        duplicateMessage = `Aviso: O e-mail "${params.email}" já está cadastrado no lead "${emailRes.rows[0].name}".`;
      }
    }

    return {
      hasDocumentDuplicate: false,
      hasContactWarning,
      duplicateMessage,
    };
  }

  static async createLead(rawInput: CreateLeadInput): Promise<LeadRecord> {
    const input = CreateLeadSchema.parse(rawInput);
    const cleanDoc = input.document ? normalizeDocument(input.document) : null;

    // Valida unicidade de documento se informado
    if (cleanDoc && cleanDoc.length > 0) {
      const dup = await this.checkDuplicateLead({ document: cleanDoc });
      if (dup.hasDocumentDuplicate) {
        throw new Error(`DOCUMENT_DUPLICATE: ${dup.duplicateMessage}`);
      }
    }

    const pool = getDbPool();
    const sql = `
      INSERT INTO crm_leads (
        person_type, name, trade_name, document, email, phone, whatsapp,
        primary_contact, segment, city, state, source, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'NEW')
      RETURNING *
    `;

    const values = [
      input.personType,
      input.name,
      input.tradeName || null,
      cleanDoc || null,
      input.email || null,
      input.phone || null,
      input.whatsapp || null,
      input.primaryContact || null,
      input.segment || null,
      input.city || null,
      input.state || null,
      input.source || "OUTROS",
      input.notes || null,
    ];

    const res = await pool.query(sql, values);
    return this.getLeadById(res.rows[0].id) as Promise<LeadRecord>;
  }

  static async updateLead(id: string, rawInput: UpdateLeadInput): Promise<LeadRecord> {
    const input = UpdateLeadSchema.parse(rawInput);
    const existing = await this.getLeadById(id);
    if (!existing) throw new Error("Lead não encontrado.");

    const cleanDoc = input.document !== undefined
      ? (input.document ? normalizeDocument(input.document) : null)
      : existing.document;

    if (cleanDoc && cleanDoc !== existing.document) {
      const dup = await this.checkDuplicateLead({ document: cleanDoc, excludeLeadId: id });
      if (dup.hasDocumentDuplicate) {
        throw new Error(`DOCUMENT_DUPLICATE: ${dup.duplicateMessage}`);
      }
    }

    const pool = getDbPool();
    const sql = `
      UPDATE crm_leads SET
        person_type = COALESCE($1, person_type),
        name = COALESCE($2, name),
        trade_name = $3,
        document = $4,
        email = $5,
        phone = $6,
        whatsapp = $7,
        primary_contact = $8,
        segment = $9,
        city = $10,
        state = $11,
        source = COALESCE($12, source),
        notes = $13,
        status = COALESCE($14, status),
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `;

    const values = [
      input.personType || null,
      input.name || null,
      input.tradeName !== undefined ? input.tradeName : existing.tradeName,
      cleanDoc,
      input.email !== undefined ? input.email : existing.email,
      input.phone !== undefined ? input.phone : existing.phone,
      input.whatsapp !== undefined ? input.whatsapp : existing.whatsapp,
      input.primaryContact !== undefined ? input.primaryContact : existing.primaryContact,
      input.segment !== undefined ? input.segment : existing.segment,
      input.city !== undefined ? input.city : existing.city,
      input.state !== undefined ? input.state : existing.state,
      input.source || null,
      input.notes !== undefined ? input.notes : existing.notes,
      input.status || null,
      id,
    ];

    await pool.query(sql, values);
    return this.getLeadById(id) as Promise<LeadRecord>;
  }

  static async archiveLead(id: string): Promise<void> {
    const pool = getDbPool();
    await pool.query(
      `UPDATE crm_leads SET status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  /**
   * Conversão de Lead em Cliente em Transação Atômica.
   * Preserva todas as oportunidades e histórico.
   * Impede conversão duplicada.
   */
  static async convertLeadToClient(rawInput: ConvertLeadInput, auditUser = "ADMIN"): Promise<{
    leadId: string;
    clientId: string;
    clientName: string;
    opportunitiesMigratedCount: number;
  }> {
    const input = ConvertLeadSchema.parse(rawInput);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Obter o Lead com bloqueio para evitar concorrência
      const leadRes = await client.query(
        `SELECT * FROM crm_leads WHERE id = $1 FOR UPDATE`,
        [input.leadId]
      );
      if (leadRes.rowCount === 0) {
        throw new Error("Lead não encontrado para conversão.");
      }
      const rawLead = leadRes.rows[0] as any;

      if (rawLead.status === "CONVERTED" || rawLead.converted_client_id) {
        throw new Error("Este lead já foi convertido anteriormente e não pode ser convertido em duplicidade.");
      }

      let finalClientId: string;
      let finalClientName: string;

      if (input.mode === "NEW_CLIENT") {
        const clientName = input.clientDataOverride?.name || rawLead.name;
        const clientTradeName = input.clientDataOverride?.tradeName || rawLead.trade_name || null;
        const rawDoc = input.clientDataOverride?.document || rawLead.document;
        const clientDoc = rawDoc ? normalizeDocument(rawDoc) : null;
        const clientEmail = input.clientDataOverride?.email || rawLead.email || null;
        const clientPhone = input.clientDataOverride?.phone || rawLead.phone || null;

        // Se houver documento, verificar se já pertence a outro cliente
        if (clientDoc && clientDoc.length > 0) {
          const dupClient = await client.query(
            `SELECT id, name FROM clients WHERE document = $1 AND status <> 'ARCHIVED'`,
            [clientDoc]
          );
          if (dupClient.rowCount && dupClient.rowCount > 0) {
            throw new Error(
              `CONVERSÃO BLOQUEADA: Já existe um cliente cadastrado com o documento informado ("${dupClient.rows[0].name}"). Utilize a opção "Vincular a Cliente Existente" para evitar duplicidades.`
            );
          }
        }

        // Criar o novo cliente
        const insertClientSql = `
          INSERT INTO clients (
            type, name, trade_name, document, email, phone, city, state, notes, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
          RETURNING id, name
        `;
        const insertClientRes = await client.query(insertClientSql, [
          rawLead.person_type || "PJ",
          clientName,
          clientTradeName,
          clientDoc,
          clientEmail,
          clientPhone,
          rawLead.city || null,
          rawLead.state || null,
          `Convertido a partir do Lead ${rawLead.lead_code}. ${rawLead.notes || ""}`.trim(),
        ]);
        finalClientId = insertClientRes.rows[0].id;
        finalClientName = insertClientRes.rows[0].name;
      } else {
        // LINK_EXISTING
        if (!input.existingClientId) {
          throw new Error("É necessário selecionar um cliente existente para o vínculo.");
        }
        const existingClientRes = await client.query(
          `SELECT id, name FROM clients WHERE id = $1 AND status <> 'ARCHIVED'`,
          [input.existingClientId]
        );
        if (existingClientRes.rowCount === 0) {
          throw new Error("Cliente selecionado para vínculo não foi encontrado ou está inativo.");
        }
        finalClientId = existingClientRes.rows[0].id;
        finalClientName = existingClientRes.rows[0].name;
      }

      // 2. Atualizar o Lead para CONVERTED
      await client.query(
        `UPDATE crm_leads SET 
          status = 'CONVERTED', 
          converted_client_id = $1, 
          converted_at = NOW(), 
          updated_at = NOW() 
         WHERE id = $2`,
        [finalClientId, input.leadId]
      );

      // 3. Migrar todas as oportunidades do Lead para apontar também para o Cliente
      const oppsUpdateRes = await client.query(
        `UPDATE crm_opportunities SET 
          client_id = $1, 
          updated_at = NOW() 
         WHERE lead_id = $2`,
        [finalClientId, input.leadId]
      );

      // 4. Registrar atividade automática de auditoria
      await client.query(
        `INSERT INTO crm_activities (
          activity_type, title, description, status, lead_id, client_id, completed_at, created_by
        ) VALUES (
          'NOTE', 'Conversão de Lead em Cliente', $1, 'COMPLETED', $2, $3, NOW(), $4
        )`,
        [
          `Lead ${rawLead.lead_code} convertido com sucesso para o cliente "${finalClientName}".`,
          input.leadId,
          finalClientId,
          auditUser,
        ]
      );

      await client.query("COMMIT");

      return {
        leadId: input.leadId,
        clientId: finalClientId,
        clientName: finalClientName,
        opportunitiesMigratedCount: oppsUpdateRes.rowCount || 0,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // 2. FUNIS E ETAPAS (PIPELINES & STAGES)
  // =========================================================================

  static async listPipelines(includeArchived = false): Promise<PipelineRecord[]> {
    const pool = getDbPool();
    const statusClause = includeArchived ? "" : "WHERE p.status = 'ACTIVE'";

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.is_default,
        p.status,
        p.archived_at,
        p.created_at,
        p.updated_at,
        COUNT(CASE WHEN o.status = 'OPEN' THEN 1 END) as open_opps_count,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN o.amount ELSE 0 END), 0) as total_pipeline_amount,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN (o.amount * o.probability / 100.0) ELSE 0 END), 0) as weighted_pipeline_amount
      FROM crm_pipelines p
      LEFT JOIN crm_opportunities o ON o.pipeline_id = p.id
      ${statusClause}
      GROUP BY p.id
      ORDER BY p.is_default DESC, p.created_at ASC
    `;

    const res = await pool.query(sql);

    // Carregar etapas para cada funil
    const pipelines: PipelineRecord[] = [];
    for (const r of res.rows) {
      const stages = await this.listStagesByPipeline(r.id);
      pipelines.push({
        id: r.id,
        name: r.name,
        description: r.description,
        isDefault: r.is_default,
        status: r.status,
        archivedAt: r.archived_at?.toISOString?.() || r.archived_at,
        createdAt: r.created_at?.toISOString?.() || r.created_at,
        updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
        stages,
        openOpportunitiesCount: parseInt(r.open_opps_count || "0", 10),
        totalPipelineAmount: Number(r.total_pipeline_amount || 0),
        weightedPipelineAmount: Number(r.weighted_pipeline_amount || 0),
      });
    }

    return pipelines;
  }

  static async listStagesByPipeline(pipelineId: string): Promise<PipelineStageRecord[]> {
    const pool = getDbPool();
    const sql = `
      SELECT 
        s.id,
        s.pipeline_id,
        s.name,
        s.color,
        s.display_order,
        s.win_probability,
        s.stage_type,
        s.status,
        s.created_at,
        s.updated_at,
        COUNT(CASE WHEN o.status = 'OPEN' THEN 1 END) as opps_count,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN o.amount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN (o.amount * o.probability / 100.0) ELSE 0 END), 0) as weighted_amount
      FROM crm_pipeline_stages s
      LEFT JOIN crm_opportunities o ON o.stage_id = s.id
      WHERE s.pipeline_id = $1 AND s.status = 'ACTIVE'
      GROUP BY s.id
      ORDER BY s.display_order ASC
    `;
    const res = await pool.query(sql, [pipelineId]);
    return res.rows.map((s) => ({
      id: s.id,
      pipelineId: s.pipeline_id,
      name: s.name,
      color: s.color,
      displayOrder: s.display_order,
      winProbability: s.win_probability,
      stageType: s.stage_type,
      status: s.status,
      createdAt: s.created_at?.toISOString?.() || s.created_at,
      updatedAt: s.updated_at?.toISOString?.() || s.updated_at,
      opportunitiesCount: parseInt(s.opps_count || "0", 10),
      totalAmount: Number(s.total_amount || 0),
      weightedAmount: Number(s.weighted_amount || 0),
    }));
  }

  static async getPipelineById(id: string): Promise<PipelineRecord | null> {
    const pool = getDbPool();
    const sql = `SELECT * FROM crm_pipelines WHERE id = $1`;
    const res = await pool.query(sql, [id]);
    if (res.rowCount === 0) return null;
    const r = res.rows[0];

    const stages = await this.listStagesByPipeline(id);

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isDefault: r.is_default,
      status: r.status,
      archivedAt: r.archived_at?.toISOString?.() || r.archived_at,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
      stages,
    };
  }

  static async createPipeline(rawInput: CreatePipelineInput): Promise<PipelineRecord> {
    const input = CreatePipelineSchema.parse(rawInput);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (input.isDefault) {
        await client.query(`UPDATE crm_pipelines SET is_default = false WHERE is_default = true`);
      }

      const sql = `
        INSERT INTO crm_pipelines (name, description, is_default, status)
        VALUES ($1, $2, $3, 'ACTIVE')
        RETURNING *
      `;
      const res = await client.query(sql, [input.name, input.description || null, input.isDefault || false]);
      const pipelineId = res.rows[0].id;

      // Criação das etapas iniciais recomendadas para o novo funil
      const stagesData = [
        { name: "Qualificação", color: "#3b82f6", order: 1, prob: 20, type: "NORMAL" },
        { name: "Proposta", color: "#f59e0b", order: 2, prob: 60, type: "NORMAL" },
        { name: "Negociação", color: "#06b6d4", order: 3, prob: 80, type: "NORMAL" },
        { name: "Fechado Ganho", color: "#10b981", order: 4, prob: 100, type: "WON" },
        { name: "Perdido", color: "#ef4444", order: 5, prob: 0, type: "LOST" },
      ];

      for (const st of stagesData) {
        await client.query(
          `INSERT INTO crm_pipeline_stages (pipeline_id, name, color, display_order, win_probability, stage_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pipelineId, st.name, st.color, st.order, st.prob, st.type]
        );
      }

      await client.query("COMMIT");
      return (await this.getPipelineById(pipelineId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async updatePipeline(id: string, rawInput: UpdatePipelineInput): Promise<PipelineRecord> {
    const input = UpdatePipelineSchema.parse(rawInput);
    const pool = getDbPool();

    if (input.isDefault) {
      await pool.query(`UPDATE crm_pipelines SET is_default = false WHERE id <> $1`, [id]);
    }

    const sql = `
      UPDATE crm_pipelines SET
        name = COALESCE($1, name),
        description = $2,
        is_default = COALESCE($3, is_default),
        status = COALESCE($4, status),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    await pool.query(sql, [
      input.name || null,
      input.description !== undefined ? input.description : null,
      input.isDefault !== undefined ? input.isDefault : null,
      input.status || null,
      id,
    ]);

    return (await this.getPipelineById(id))!;
  }

  static async archivePipeline(id: string): Promise<void> {
    const pool = getDbPool();
    // Bloquear arquivamento se for o único funil padrão ativo
    const checkDefault = await pool.query(
      `SELECT is_default FROM crm_pipelines WHERE id = $1`,
      [id]
    );
    if (checkDefault.rows[0]?.is_default) {
      const activeOthers = await pool.query(
        `SELECT COUNT(*) as count FROM crm_pipelines WHERE status = 'ACTIVE' AND id <> $1`,
        [id]
      );
      if (parseInt(activeOthers.rows[0]?.count || "0", 10) === 0) {
        throw new Error("Não é permitido arquivar o único funil ativo do sistema.");
      }
    }

    await pool.query(
      `UPDATE crm_pipelines SET status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  static async createStage(rawInput: CreateStageInput): Promise<PipelineStageRecord> {
    const input = CreateStageSchema.parse(rawInput);
    const pool = getDbPool();

    // Determina a ordem se omitida
    let order = input.displayOrder;
    if (order === 0) {
      const maxOrderRes = await pool.query<{ max_order: number }>(
        `SELECT COALESCE(MAX(display_order), 0) + 1 as max_order FROM crm_pipeline_stages WHERE pipeline_id = $1`,
        [input.pipelineId]
      );
      order = maxOrderRes.rows[0].max_order;
    }

    const sql = `
      INSERT INTO crm_pipeline_stages (
        pipeline_id, name, color, display_order, win_probability, stage_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING *
    `;

    const res = await pool.query(sql, [
      input.pipelineId,
      input.name,
      input.color || "#6366f1",
      order,
      input.winProbability,
      input.stageType || "NORMAL",
    ]);

    const r = res.rows[0];
    return {
      id: r.id,
      pipelineId: r.pipeline_id,
      name: r.name,
      color: r.color,
      displayOrder: r.display_order,
      winProbability: r.win_probability,
      stageType: r.stage_type,
      status: r.status,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
    };
  }

  static async updateStage(id: string, rawInput: UpdateStageInput): Promise<PipelineStageRecord> {
    const input = UpdateStageSchema.parse(rawInput);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Se estiver arquivando a etapa, verificar se há oportunidades abertas nela
      if (input.status === "ARCHIVED") {
        const checkOpps = await client.query(
          `SELECT COUNT(*) as count FROM crm_opportunities WHERE stage_id = $1 AND status = 'OPEN'`,
          [id]
        );
        const count = parseInt(checkOpps.rows[0]?.count || "0", 10);
        if (count > 0) {
          if (!input.relocateOpportunitiesToStageId) {
            throw new Error(
              `Não é permitido arquivar uma etapa com ${count} oportunidade(s) aberta(s) sem informar uma etapa de destino para realocação controlada.`
            );
          }
          // Realocar oportunidades para a nova etapa
          await client.query(
            `UPDATE crm_opportunities SET stage_id = $1, updated_at = NOW() WHERE stage_id = $2`,
            [input.relocateOpportunitiesToStageId, id]
          );
        }
      }

      const sql = `
        UPDATE crm_pipeline_stages SET
          name = COALESCE($1, name),
          color = COALESCE($2, color),
          display_order = COALESCE($3, display_order),
          win_probability = COALESCE($4, win_probability),
          stage_type = COALESCE($5, stage_type),
          status = COALESCE($6, status),
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;

      const res = await client.query(sql, [
        input.name || null,
        input.color || null,
        input.displayOrder !== undefined ? input.displayOrder : null,
        input.winProbability !== undefined ? input.winProbability : null,
        input.stageType || null,
        input.status || null,
        id,
      ]);

      await client.query("COMMIT");
      const r = res.rows[0];
      return {
        id: r.id,
        pipelineId: r.pipeline_id,
        name: r.name,
        color: r.color,
        displayOrder: r.display_order,
        winProbability: r.win_probability,
        stageType: r.stage_type,
        status: r.status,
        createdAt: r.created_at?.toISOString?.() || r.created_at,
        updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async reorderStages(
    pipelineId: string,
    stageOrders: { stageId: string; displayOrder: number }[]
  ): Promise<void> {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const item of stageOrders) {
        await client.query(
          `UPDATE crm_pipeline_stages SET display_order = $1, updated_at = NOW() WHERE id = $2 AND pipeline_id = $3`,
          [item.displayOrder, item.stageId, pipelineId]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // 3. OPORTUNIDADES COMERCIAIS (OPPORTUNITIES)
  // =========================================================================

  static async listOpportunities(params?: {
    pipelineId?: string;
    stageId?: string;
    status?: OpportunityStatus | "ALL";
    leadId?: string;
    clientId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ opportunities: OpportunityRecord[]; total: number }> {
    const pool = getDbPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.pipelineId) {
      conditions.push(`o.pipeline_id = $${idx++}`);
      values.push(params.pipelineId);
    }

    if (params?.stageId) {
      conditions.push(`o.stage_id = $${idx++}`);
      values.push(params.stageId);
    }

    if (params?.status && params.status !== "ALL") {
      conditions.push(`o.status = $${idx++}`);
      values.push(params.status);
    }

    if (params?.leadId) {
      conditions.push(`o.lead_id = $${idx++}`);
      values.push(params.leadId);
    }

    if (params?.clientId) {
      conditions.push(`o.client_id = $${idx++}`);
      values.push(params.clientId);
    }

    if (params?.search) {
      conditions.push(
        `(o.title ILIKE $${idx} OR o.opportunity_code ILIKE $${idx} OR l.name ILIKE $${idx} OR c.name ILIKE $${idx})`
      );
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(*) as total 
      FROM crm_opportunities o
      LEFT JOIN crm_leads l ON l.id = o.lead_id
      LEFT JOIN clients c ON c.id = o.client_id
      ${whereClause}
    `;
    const countRes = await pool.query<{ total: string }>(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const limit = params?.limit || 100;
    const offset = params?.offset || 0;

    const sql = `
      SELECT 
        o.id,
        o.opportunity_code,
        o.title,
        o.lead_id,
        o.client_id,
        o.pipeline_id,
        o.stage_id,
        o.amount,
        o.billing_period,
        o.probability,
        o.normalized_monthly_value,
        o.source,
        o.expected_close_date,
        o.closed_at,
        o.status,
        o.lost_reason,
        o.notes,
        o.proposal_id,
        o.contract_id,
        o.created_at,
        o.updated_at,
        p.name as pipeline_name,
        st.name as stage_name,
        st.color as stage_color,
        st.stage_type,
        COALESCE(l.name, c.name) as contact_name,
        CASE WHEN o.client_id IS NOT NULL THEN 'CLIENT' ELSE 'LEAD' END as contact_type
      FROM crm_opportunities o
      JOIN crm_pipelines p ON p.id = o.pipeline_id
      JOIN crm_pipeline_stages st ON st.id = o.stage_id
      LEFT JOIN crm_leads l ON l.id = o.lead_id
      LEFT JOIN clients c ON c.id = o.client_id
      ${whereClause}
      ORDER BY st.display_order ASC, o.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const res = await pool.query(sql, [...values, limit, offset]);

    const opportunities: OpportunityRecord[] = res.rows.map((r) => ({
      id: r.id,
      opportunityCode: r.opportunity_code,
      title: r.title,
      leadId: r.lead_id,
      clientId: r.client_id,
      pipelineId: r.pipeline_id,
      stageId: r.stage_id,
      amount: Number(r.amount),
      billingPeriod: r.billing_period,
      probability: r.probability,
      normalizedMonthlyValue: Number(r.normalized_monthly_value),
      source: r.source,
      expectedCloseDate: r.expected_close_date?.toISOString?.()?.slice(0, 10) || r.expected_close_date,
      closedAt: r.closed_at?.toISOString?.() || r.closed_at,
      status: r.status,
      lostReason: r.lost_reason,
      notes: r.notes,
      proposalId: r.proposal_id,
      contractId: r.contract_id,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
      contactName: r.contact_name,
      contactType: r.contact_type,
      pipelineName: r.pipeline_name,
      stageName: r.stage_name,
      stageColor: r.stage_color,
      stageType: r.stage_type,
    }));

    return { opportunities, total };
  }

  static async getOpportunityById(id: string): Promise<OpportunityRecord | null> {
    const pool = getDbPool();
    const sql = `
      SELECT 
        o.id,
        o.opportunity_code,
        o.title,
        o.lead_id,
        o.client_id,
        o.pipeline_id,
        o.stage_id,
        o.amount,
        o.billing_period,
        o.probability,
        o.normalized_monthly_value,
        o.source,
        o.expected_close_date,
        o.closed_at,
        o.status,
        o.lost_reason,
        o.notes,
        o.proposal_id,
        o.contract_id,
        o.created_at,
        o.updated_at,
        p.name as pipeline_name,
        st.name as stage_name,
        st.color as stage_color,
        st.stage_type,
        COALESCE(l.name, c.name) as contact_name,
        CASE WHEN o.client_id IS NOT NULL THEN 'CLIENT' ELSE 'LEAD' END as contact_type
      FROM crm_opportunities o
      JOIN crm_pipelines p ON p.id = o.pipeline_id
      JOIN crm_pipeline_stages st ON st.id = o.stage_id
      LEFT JOIN crm_leads l ON l.id = o.lead_id
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE o.id = $1
    `;
    const res = await pool.query(sql, [id]);
    if (res.rowCount === 0) return null;
    const r = res.rows[0];

    return {
      id: r.id,
      opportunityCode: r.opportunity_code,
      title: r.title,
      leadId: r.lead_id,
      clientId: r.client_id,
      pipelineId: r.pipeline_id,
      stageId: r.stage_id,
      amount: Number(r.amount),
      billingPeriod: r.billing_period,
      probability: r.probability,
      normalizedMonthlyValue: Number(r.normalized_monthly_value),
      source: r.source,
      expectedCloseDate: r.expected_close_date?.toISOString?.()?.slice(0, 10) || r.expected_close_date,
      closedAt: r.closed_at?.toISOString?.() || r.closed_at,
      status: r.status,
      lostReason: r.lost_reason,
      notes: r.notes,
      proposalId: r.proposal_id,
      contractId: r.contract_id,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
      contactName: r.contact_name,
      contactType: r.contact_type,
      pipelineName: r.pipeline_name,
      stageName: r.stage_name,
      stageColor: r.stage_color,
      stageType: r.stage_type,
    };
  }

  static async createOpportunity(
    rawInput: CreateOpportunityInput,
    auditUser = "ADMIN"
  ): Promise<OpportunityRecord> {
    const input = CreateOpportunitySchema.parse(rawInput);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Obter a etapa inicial se omitida
      let targetStageId = input.stageId;

      if (!targetStageId) {
        const firstStage = await client.query(
          `SELECT id, win_probability FROM crm_pipeline_stages WHERE pipeline_id = $1 AND status = 'ACTIVE' ORDER BY display_order ASC LIMIT 1`,
          [input.pipelineId]
        );
        if (firstStage.rowCount === 0) {
          throw new Error("O funil selecionado não possui etapas ativas configuradas.");
        }
        targetStageId = firstStage.rows[0].id;
      }

      let probability = input.probability;
      if (probability === undefined) {
        const stageRes = await client.query<{ win_probability: number }>(
          `SELECT win_probability FROM crm_pipeline_stages WHERE id = $1`,
          [targetStageId]
        );
        if (stageRes.rowCount && stageRes.rowCount > 0) {
          probability = stageRes.rows[0].win_probability;
        } else {
          probability = 50;
        }
      }

      const billingPeriod = input.billingPeriod || "MONTHLY";
      const normalizedMrr = computeNormalizedMonthlyValue(billingPeriod, input.amount);

      const sql = `
        INSERT INTO crm_opportunities (
          title, lead_id, client_id, pipeline_id, stage_id, amount,
          billing_period, probability, normalized_monthly_value,
          source, expected_close_date, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'OPEN')
        RETURNING *
      `;

      const values = [
        input.title,
        input.leadId || null,
        input.clientId || null,
        input.pipelineId,
        targetStageId,
        input.amount,
        billingPeriod,
        probability,
        normalizedMrr,
        input.source || null,
        input.expectedCloseDate || null,
        input.notes || null,
      ];

      const res = await client.query(sql, values);
      const oppId = res.rows[0].id;

      // 2. Registrar histórico inicial
      await client.query(
        `INSERT INTO crm_opportunity_history (
          opportunity_id, to_pipeline_id, to_stage_id, to_status, to_amount, notes, created_by
        ) VALUES ($1, $2, $3, 'OPEN', $4, 'Criação da oportunidade', $5)`,
        [oppId, input.pipelineId, targetStageId, input.amount, auditUser]
      );

      await client.query("COMMIT");
      return (await this.getOpportunityById(oppId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateOpportunity(
    id: string,
    rawInput: UpdateOpportunityInput,
    auditUser = "ADMIN"
  ): Promise<OpportunityRecord> {
    const input = UpdateOpportunitySchema.parse(rawInput);
    const existing = await this.getOpportunityById(id);
    if (!existing) throw new Error("Oportunidade não encontrada.");

    const billingPeriod = input.billingPeriod || existing.billingPeriod;
    const amount = input.amount !== undefined ? input.amount : existing.amount;
    const normalizedMrr = computeNormalizedMonthlyValue(billingPeriod, amount);

    const pool = getDbPool();
    const sql = `
      UPDATE crm_opportunities SET
        title = COALESCE($1, title),
        amount = COALESCE($2, amount),
        billing_period = COALESCE($3, billing_period),
        probability = COALESCE($4, probability),
        normalized_monthly_value = $5,
        source = COALESCE($6, source),
        expected_close_date = COALESCE($7, expected_close_date),
        notes = COALESCE($8, notes),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;

    await pool.query(sql, [
      input.title || null,
      input.amount !== undefined ? input.amount : null,
      input.billingPeriod || null,
      input.probability !== undefined ? input.probability : null,
      normalizedMrr,
      input.source || null,
      input.expectedCloseDate || null,
      input.notes || null,
      id,
    ]);

    return (await this.getOpportunityById(id))!;
  }

  static async moveOpportunity(
    rawInput: MoveOpportunityInput,
    auditUser = "ADMIN"
  ): Promise<OpportunityRecord> {
    const input = MoveOpportunitySchema.parse(rawInput);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await this.getOpportunityById(input.opportunityId);
      if (!existing) throw new Error("Oportunidade não encontrada.");

      // Verificar nova etapa
      const stageRes = await client.query(
        `SELECT id, pipeline_id, name, stage_type, win_probability FROM crm_pipeline_stages WHERE id = $1 AND status = 'ACTIVE'`,
        [input.toStageId]
      );
      if (stageRes.rowCount === 0) {
        throw new Error("Etapa de destino não encontrada ou inativa.");
      }
      const newStage = stageRes.rows[0];

      const newPipelineId = input.toPipelineId || newStage.pipeline_id;

      // Garantir que a etapa pertence ao funil de destino
      if (newStage.pipeline_id !== newPipelineId) {
        throw new Error("A etapa selecionada não pertence ao funil de destino informado.");
      }

      // Se mover para etapa WON ou LOST, ajustar status automaticamente
      let newStatus: OpportunityStatus = existing.status;
      let closedAt: Date | null = existing.closedAt ? new Date(existing.closedAt) : null;

      if (newStage.stage_type === "WON") {
        newStatus = "WON";
        closedAt = new Date();
      } else if (newStage.stage_type === "LOST") {
        newStatus = "LOST";
        closedAt = new Date();
      } else if (existing.status !== "OPEN") {
        // Se estava fechada e moveu para normal, reabre
        newStatus = "OPEN";
        closedAt = null;
      }

      // Atualiza oportunidade
      await client.query(
        `UPDATE crm_opportunities SET 
          stage_id = $1, 
          pipeline_id = $2, 
          probability = $3, 
          status = $4, 
          closed_at = $5,
          updated_at = NOW() 
         WHERE id = $6`,
        [input.toStageId, newPipelineId, newStage.win_probability, newStatus, closedAt, input.opportunityId]
      );

      // Registrar histórico
      await client.query(
        `INSERT INTO crm_opportunity_history (
          opportunity_id, from_pipeline_id, to_pipeline_id, from_stage_id, to_stage_id,
          from_status, to_status, from_amount, to_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          input.opportunityId,
          existing.pipelineId,
          newPipelineId,
          existing.stageId,
          input.toStageId,
          existing.status,
          newStatus,
          existing.amount,
          existing.amount,
          input.notes || `Movido para etapa ${newStage.name}`,
          auditUser,
        ]
      );

      await client.query("COMMIT");
      return (await this.getOpportunityById(input.opportunityId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async closeOpportunity(
    rawInput: CloseOpportunityInput,
    auditUser = "ADMIN"
  ): Promise<OpportunityRecord> {
    const input = CloseOpportunitySchema.parse(rawInput);
    const existing = await this.getOpportunityById(input.opportunityId);
    if (!existing) throw new Error("Oportunidade não encontrada.");

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Buscar etapa correspondente ao status de encerramento no funil da oportunidade
      let targetStageId = existing.stageId;
      if (input.status === "WON") {
        const wonStage = await client.query(
          `SELECT id FROM crm_pipeline_stages WHERE pipeline_id = $1 AND stage_type = 'WON' AND status = 'ACTIVE' LIMIT 1`,
          [existing.pipelineId]
        );
        if (wonStage.rowCount && wonStage.rowCount > 0) {
          targetStageId = wonStage.rows[0].id;
        }
      } else if (input.status === "LOST") {
        const lostStage = await client.query(
          `SELECT id FROM crm_pipeline_stages WHERE pipeline_id = $1 AND stage_type = 'LOST' AND status = 'ACTIVE' LIMIT 1`,
          [existing.pipelineId]
        );
        if (lostStage.rowCount && lostStage.rowCount > 0) {
          targetStageId = lostStage.rows[0].id;
        }
      }

      await client.query(
        `UPDATE crm_opportunities SET 
          status = $1, 
          lost_reason = $2, 
          stage_id = $3,
          probability = $4,
          closed_at = NOW(), 
          updated_at = NOW() 
         WHERE id = $5`,
        [
          input.status,
          input.lostReason || null,
          targetStageId,
          input.status === "WON" ? 100 : 0,
          input.opportunityId,
        ]
      );

      await client.query(
        `INSERT INTO crm_opportunity_history (
          opportunity_id, from_stage_id, to_stage_id, from_status, to_status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.opportunityId,
          existing.stageId,
          targetStageId,
          existing.status,
          input.status,
          input.notes || (input.status === "WON" ? "Oportunidade GANHA!" : `Fechada como ${input.status}: ${input.lostReason}`),
          auditUser,
        ]
      );

      await client.query("COMMIT");
      return (await this.getOpportunityById(input.opportunityId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async reopenOpportunity(
    id: string,
    toStageIdOrNotes?: string,
    notesOrAuditUser?: string
  ): Promise<OpportunityRecord> {
    const isUuid = typeof toStageIdOrNotes === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(toStageIdOrNotes);
    const toStageId = isUuid ? toStageIdOrNotes : undefined;
    const historyNotes = (isUuid ? notesOrAuditUser : toStageIdOrNotes) || "Reabertura explícita da oportunidade";
    const auditUser = "ADMIN";

    const existing = await this.getOpportunityById(id);
    if (!existing) throw new Error("Oportunidade não encontrada.");

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      let targetStage = toStageId || existing.stageId;
      // Se a etapa atual for WON ou LOST, pega a primeira etapa normal
      const checkStage = await client.query(
        `SELECT stage_type, win_probability FROM crm_pipeline_stages WHERE id = $1`,
        [targetStage]
      );
      let prob = 50;

      if (checkStage.rows[0]?.stage_type !== "NORMAL") {
        const firstNormal = await client.query(
          `SELECT id, win_probability FROM crm_pipeline_stages WHERE pipeline_id = $1 AND stage_type = 'NORMAL' AND status = 'ACTIVE' ORDER BY display_order ASC LIMIT 1`,
          [existing.pipelineId]
        );
        if (firstNormal.rowCount && firstNormal.rowCount > 0) {
          targetStage = firstNormal.rows[0].id;
          prob = firstNormal.rows[0].win_probability;
        }
      } else {
        prob = checkStage.rows[0].win_probability;
      }

      await client.query(
        `UPDATE crm_opportunities SET 
          status = 'OPEN', 
          stage_id = $1, 
          probability = $2, 
          closed_at = NULL, 
          lost_reason = NULL, 
          updated_at = NOW() 
         WHERE id = $3`,
        [targetStage, prob, id]
      );

      await client.query(
        `INSERT INTO crm_opportunity_history (
          opportunity_id, from_stage_id, to_stage_id, from_status, to_status, notes, created_by
        ) VALUES ($1, $2, $3, $4, 'OPEN', $5, $6)`,
        [id, existing.stageId, targetStage, existing.status, historyNotes, auditUser]
      );

      await client.query("COMMIT");
      return (await this.getOpportunityById(id))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async listOpportunityHistory(opportunityId: string): Promise<OpportunityHistoryRecord[]> {
    const pool = getDbPool();
    const sql = `
      SELECT 
        h.*,
        fs.name as from_stage_name,
        ts.name as to_stage_name,
        fp.name as from_pipeline_name,
        tp.name as to_pipeline_name
      FROM crm_opportunity_history h
      LEFT JOIN crm_pipeline_stages fs ON fs.id = h.from_stage_id
      LEFT JOIN crm_pipeline_stages ts ON ts.id = h.to_stage_id
      LEFT JOIN crm_pipelines fp ON fp.id = h.from_pipeline_id
      LEFT JOIN crm_pipelines tp ON tp.id = h.to_pipeline_id
      WHERE h.opportunity_id = $1
      ORDER BY h.created_at DESC
    `;
    const res = await pool.query(sql, [opportunityId]);
    return res.rows.map((r) => ({
      id: r.id,
      opportunityId: r.opportunity_id,
      fromPipelineId: r.from_pipeline_id,
      toPipelineId: r.to_pipeline_id,
      fromStageId: r.from_stage_id,
      toStageId: r.to_stage_id,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      fromAmount: r.from_amount ? Number(r.from_amount) : null,
      toAmount: r.to_amount ? Number(r.to_amount) : null,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      fromStageName: r.from_stage_name,
      toStageName: r.to_stage_name,
      fromPipelineName: r.from_pipeline_name,
      toPipelineName: r.to_pipeline_name,
    }));
  }

  // =========================================================================
  // 4. ATIVIDADES E FOLLOW-UPS
  // =========================================================================

  static async listActivities(params?: {
    leadId?: string;
    clientId?: string;
    opportunityId?: string;
    status?: ActivityStatus;
    overdueOnly?: boolean;
    limit?: number;
  }): Promise<ActivityRecord[]> {
    const pool = getDbPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.leadId) {
      conditions.push(`a.lead_id = $${idx++}`);
      values.push(params.leadId);
    }
    if (params?.clientId) {
      conditions.push(`a.client_id = $${idx++}`);
      values.push(params.clientId);
    }
    if (params?.opportunityId) {
      conditions.push(`a.opportunity_id = $${idx++}`);
      values.push(params.opportunityId);
    }
    if (params?.status) {
      conditions.push(`a.status = $${idx++}`);
      values.push(params.status);
    }
    if (params?.overdueOnly) {
      conditions.push(`a.due_date < NOW() AND a.status = 'PENDING'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = params?.limit || 100;

    const sql = `
      SELECT 
        a.id,
        a.activity_type,
        a.title,
        a.description,
        a.due_date,
        a.completed_at,
        a.status,
        a.lead_id,
        a.client_id,
        a.opportunity_id,
        a.created_by,
        a.created_at,
        a.updated_at,
        (a.due_date < NOW() AND a.status = 'PENDING') as is_overdue,
        COALESCE(l.name, c.name) as target_name,
        o.title as opportunity_title
      FROM crm_activities a
      LEFT JOIN crm_leads l ON l.id = a.lead_id
      LEFT JOIN clients c ON c.id = a.client_id
      LEFT JOIN crm_opportunities o ON o.id = a.opportunity_id
      ${whereClause}
      ORDER BY 
        CASE WHEN a.status = 'PENDING' THEN 0 ELSE 1 END,
        a.due_date ASC NULLS LAST,
        a.created_at DESC
      LIMIT $${idx}
    `;

    const res = await pool.query(sql, [...values, limit]);
    return res.rows.map((r) => ({
      id: r.id,
      activityType: r.activity_type,
      title: r.title,
      description: r.description,
      dueDate: r.due_date?.toISOString?.() || r.due_date,
      completedAt: r.completed_at?.toISOString?.() || r.completed_at,
      status: r.status,
      leadId: r.lead_id,
      clientId: r.client_id,
      opportunityId: r.opportunity_id,
      createdBy: r.created_by,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
      isOverdue: Boolean(r.is_overdue),
      targetName: r.target_name,
      opportunityTitle: r.opportunity_title,
    }));
  }

  static async createActivity(rawInput: CreateActivityInput, auditUser = "ADMIN"): Promise<ActivityRecord> {
    const input = CreateActivitySchema.parse(rawInput);
    const pool = getDbPool();

    const sql = `
      INSERT INTO crm_activities (
        activity_type, title, description, due_date, lead_id, client_id, opportunity_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING *
    `;

    const res = await pool.query(sql, [
      input.activityType,
      input.title,
      input.description || null,
      input.dueDate || null,
      input.leadId || null,
      input.clientId || null,
      input.opportunityId || null,
      auditUser,
    ]);

    const r = res.rows[0];
    return {
      id: r.id,
      activityType: r.activity_type,
      title: r.title,
      description: r.description,
      dueDate: r.due_date?.toISOString?.() || r.due_date,
      completedAt: r.completed_at?.toISOString?.() || r.completed_at,
      status: r.status,
      leadId: r.lead_id,
      clientId: r.client_id,
      opportunityId: r.opportunity_id,
      createdBy: r.created_by,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
    };
  }

  static async updateActivity(id: string, rawInput: UpdateActivityInput): Promise<ActivityRecord> {
    const input = UpdateActivitySchema.parse(rawInput);
    const pool = getDbPool();

    const sql = `
      UPDATE crm_activities SET
        activity_type = COALESCE($1, activity_type),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        due_date = COALESCE($4, due_date),
        status = COALESCE($5, status),
        completed_at = CASE WHEN $5 = 'COMPLETED' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const res = await pool.query(sql, [
      input.activityType || null,
      input.title || null,
      input.description !== undefined ? input.description : null,
      input.dueDate || null,
      input.status || null,
      id,
    ]);

    if (res.rowCount === 0) throw new Error("Atividade não encontrada.");
    const r = res.rows[0];
    return {
      id: r.id,
      activityType: r.activity_type,
      title: r.title,
      description: r.description,
      dueDate: r.due_date?.toISOString?.() || r.due_date,
      completedAt: r.completed_at?.toISOString?.() || r.completed_at,
      status: r.status,
      leadId: r.lead_id,
      clientId: r.client_id,
      opportunityId: r.opportunity_id,
      createdBy: r.created_by,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
    };
  }

  static async completeActivity(id: string, auditUser = "ADMIN"): Promise<ActivityRecord> {
    const pool = getDbPool();
    const res = await pool.query(
      `UPDATE crm_activities SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (res.rowCount === 0) throw new Error("Atividade não encontrada.");
    const r = res.rows[0];
    return {
      id: r.id,
      activityType: r.activity_type,
      title: r.title,
      description: r.description,
      dueDate: r.due_date?.toISOString?.() || r.due_date,
      completedAt: r.completed_at?.toISOString?.() || r.completed_at,
      status: r.status,
      leadId: r.lead_id,
      clientId: r.client_id,
      opportunityId: r.opportunity_id,
      createdBy: r.created_by,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
    };
  }

  static async deleteActivity(id: string): Promise<void> {
    const pool = getDbPool();
    await pool.query(`DELETE FROM crm_activities WHERE id = $1`, [id]);
  }

  // =========================================================================
  // 5. INDICADORES DO CRM (KPIS & ANALYTICS)
  // =========================================================================

  static async getCrmKpis(pipelineId?: string): Promise<CrmKpiSummary> {
    const pool = getDbPool();
    const pipeCondition = pipelineId ? `AND o.pipeline_id = '${pipelineId}'` : "";

    // 1. Leads Ativos
    const leadsRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM crm_leads WHERE status NOT IN ('ARCHIVED', 'CONVERTED')`
    );
    const activeLeadsCount = parseInt(leadsRes.rows[0]?.count || "0", 10);

    // 2. Leads por Origem
    const sourceRes = await pool.query<{ source: string; count: string }>(
      `SELECT source, COUNT(*) as count FROM crm_leads WHERE status <> 'ARCHIVED' GROUP BY source ORDER BY count DESC`
    );
    const leadsBySource = sourceRes.rows.map((r) => ({
      source: r.source || "Outros",
      count: parseInt(r.count, 10),
    }));

    // 3. Oportunidades Abertas, Pipeline Total, Ponderado e MRR Potencial
    const oppSummaryRes = await pool.query<{
      open_count: string;
      total_amount: string;
      weighted_amount: string;
      potential_mrr: string;
    }>(
      `SELECT 
        COUNT(CASE WHEN o.status = 'OPEN' THEN 1 END) as open_count,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN o.amount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN (o.amount * o.probability / 100.0) ELSE 0 END), 0) as weighted_amount,
        COALESCE(SUM(CASE WHEN o.status = 'OPEN' THEN o.normalized_monthly_value ELSE 0 END), 0) as potential_mrr
      FROM crm_opportunities o
      WHERE 1=1 ${pipeCondition}`
    );

    const s = oppSummaryRes.rows[0];
    const openOpportunitiesCount = parseInt(s?.open_count || "0", 10);
    const totalPipelineAmount = Number(s?.total_amount || 0);
    const weightedPipelineAmount = Number(Number(s?.weighted_amount || 0).toFixed(2));
    const potentialMrr = Number(s?.potential_mrr || 0);

    // 4. Taxa de Conversão: WON / (WON + LOST) excluindo CANCELED
    const winRateRes = await pool.query<{
      won_count: string;
      lost_count: string;
      canceled_count: string;
      avg_days: string;
    }>(
      `SELECT 
        COUNT(CASE WHEN o.status = 'WON' THEN 1 END) as won_count,
        COUNT(CASE WHEN o.status = 'LOST' THEN 1 END) as lost_count,
        COUNT(CASE WHEN o.status = 'CANCELED' THEN 1 END) as canceled_count,
        COALESCE(AVG(CASE WHEN o.status = 'WON' AND o.closed_at IS NOT NULL THEN (EXTRACT(EPOCH FROM (o.closed_at - o.created_at)) / 86400.0) END), 0) as avg_days
      FROM crm_opportunities o
      WHERE 1=1 ${pipeCondition}`
    );

    const w = winRateRes.rows[0];
    const wonCountPeriod = parseInt(w?.won_count || "0", 10);
    const lostCountPeriod = parseInt(w?.lost_count || "0", 10);
    const canceledCountPeriod = parseInt(w?.canceled_count || "0", 10);
    const avgDaysToClose = Number(Number(w?.avg_days || 0).toFixed(1));

    const totalClosed = wonCountPeriod + lostCountPeriod;
    const conversionRate = totalClosed > 0 ? Number(((wonCountPeriod / totalClosed) * 100).toFixed(1)) : 0;

    // 5. Atividades Pendentes e Atrasadas
    const actRes = await pool.query<{ pending_count: string; overdue_count: string }>(
      `SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'PENDING' AND due_date < NOW() THEN 1 END) as overdue_count
      FROM crm_activities`
    );
    const pendingActivitiesCount = parseInt(actRes.rows[0]?.pending_count || "0", 10);
    const overdueActivitiesCount = parseInt(actRes.rows[0]?.overdue_count || "0", 10);

    // 6. Distribuição por Etapa
    const stagesDistRes = await pool.query<{
      stage_id: string;
      stage_name: string;
      stage_color: string;
      count: string;
      total_amount: string;
    }>(
      `SELECT 
        st.id as stage_id,
        st.name as stage_name,
        st.color as stage_color,
        COUNT(o.id) as count,
        COALESCE(SUM(o.amount), 0) as total_amount
      FROM crm_pipeline_stages st
      LEFT JOIN crm_opportunities o ON o.stage_id = st.id AND o.status = 'OPEN'
      WHERE st.status = 'ACTIVE'
      GROUP BY st.id, st.name, st.color, st.display_order
      ORDER BY st.display_order ASC`
    );

    const opportunitiesByStage = stagesDistRes.rows.map((r) => ({
      stageId: r.stage_id,
      stageName: r.stage_name,
      stageColor: r.stage_color,
      count: parseInt(r.count, 10),
      totalAmount: Number(r.total_amount),
    }));

    return {
      activeLeadsCount,
      leadsBySource,
      openOpportunitiesCount,
      totalPipelineAmount,
      weightedPipelineAmount,
      potentialMrr,
      conversionRate,
      wonCountPeriod,
      lostCountPeriod,
      canceledCountPeriod,
      avgDaysToClose,
      pendingActivitiesCount,
      overdueActivitiesCount,
      opportunitiesByStage,
    };
  }
}
