import { query, withTransaction } from "@/lib/db/pool";
import {
  StrategyDocumentRecord,
  StrategySectionRecord,
  StrategyBlockRecord,
  StrategyGoalRecord,
  GoalComparisonResult,
  StrategyInitiativeRecord,
  StrategyFrameworkRecord,
} from "./types";

export class StrategyService {
  // ==========================================
  // DOCUMENTOS & SEÇÕES & BLOCOS
  // ==========================================

  static async listDocuments(category?: string): Promise<StrategyDocumentRecord[]> {
    let sql = `
      SELECT id, code, title, category, topic_number, description, status, current_version, responsible_id, metadata, created_at, updated_at
      FROM strategy_documents
    `;
    const params: unknown[] = [];
    if (category && category !== "ALL") {
      sql += ` WHERE category = $1`;
      params.push(category);
    }
    sql += ` ORDER BY topic_number ASC NULLS LAST, code ASC`;

    const res = await query(sql, params);
    return res.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      category: r.category,
      topicNumber: r.topic_number,
      description: r.description,
      status: r.status,
      currentVersion: r.current_version,
      responsibleId: r.responsible_id,
      metadata: r.metadata || {},
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));
  }

  static async getDocumentByCode(code: string): Promise<StrategyDocumentRecord | null> {
    const docRes = await query(
      `SELECT * FROM strategy_documents WHERE code = $1`,
      [code]
    );
    if (docRes.rowCount === 0) return null;
    const d = docRes.rows[0];

    // Buscar seções e blocos
    const secRes = await query(
      `SELECT * FROM strategy_sections WHERE document_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [d.id]
    );

    const sections: StrategySectionRecord[] = [];
    for (const s of secRes.rows) {
      const blockRes = await query(
        `SELECT * FROM strategy_blocks WHERE section_id = $1 ORDER BY sort_order ASC, created_at ASC`,
        [s.id]
      );

      sections.push({
        id: s.id,
        documentId: s.document_id,
        title: s.title,
        description: s.description,
        sortOrder: s.sort_order,
        isCollapsed: s.is_collapsed,
        metadata: s.metadata || {},
        createdAt: s.created_at.toISOString(),
        updatedAt: s.updated_at.toISOString(),
        blocks: blockRes.rows.map((b: any) => ({
          id: b.id,
          sectionId: b.section_id,
          blockType: b.block_type,
          title: b.title,
          instructions: b.instructions,
          content: b.content || {},
          classification: b.classification,
          dataNature: b.data_nature,
          unit: b.unit,
          isRequired: b.is_required,
          isVisiblePdf: b.is_visible_pdf,
          responsibleId: b.responsible_id,
          sourceInfo: b.source_info,
          sortOrder: b.sort_order,
          gridWidth: b.grid_width,
          metadata: b.metadata || {},
          createdAt: b.created_at.toISOString(),
          updatedAt: b.updated_at.toISOString(),
        })),
      });
    }

    return {
      id: d.id,
      code: d.code,
      title: d.title,
      category: d.category,
      topicNumber: d.topic_number,
      description: d.description,
      status: d.status,
      currentVersion: d.current_version,
      responsibleId: d.responsible_id,
      metadata: d.metadata || {},
      sections,
      createdAt: d.created_at.toISOString(),
      updatedAt: d.updated_at.toISOString(),
    };
  }

  static async updateBlock(
    blockId: string,
    updates: Partial<StrategyBlockRecord>,
    authorName = "Usuário Otimizza"
  ): Promise<StrategyBlockRecord> {
    const existingRes = await query(`SELECT * FROM strategy_blocks WHERE id = $1`, [blockId]);
    if (existingRes.rowCount === 0) throw new Error("Bloco não encontrado.");
    const existing = existingRes.rows[0];

    const newTitle = updates.title !== undefined ? updates.title : existing.title;
    const newContent = updates.content !== undefined ? updates.content : existing.content;
    const newInstructions = updates.instructions !== undefined ? updates.instructions : existing.instructions;
    const newClassification = updates.classification !== undefined ? updates.classification : existing.classification;
    const newUnit = updates.unit !== undefined ? updates.unit : existing.unit;
    const newIsVisiblePdf = updates.isVisiblePdf !== undefined ? updates.isVisiblePdf : existing.is_visible_pdf;
    const newGridWidth = updates.gridWidth !== undefined ? updates.gridWidth : existing.grid_width;
    const newSortOrder = updates.sortOrder !== undefined ? updates.sortOrder : existing.sort_order;

    const res = await query(
      `
      UPDATE strategy_blocks
      SET title = $1, content = $2, instructions = $3, classification = $4,
          unit = $5, is_visible_pdf = $6, grid_width = $7, sort_order = $8,
          updated_at = now()
      WHERE id = $9
      RETURNING *
      `,
      [newTitle, newContent, newInstructions, newClassification, newUnit, newIsVisiblePdf, newGridWidth, newSortOrder, blockId]
    );

    // Auditoria
    await query(
      `
      INSERT INTO strategy_audit_logs (entity_type, entity_id, action, previous_state, new_state, author_name)
      VALUES ('BLOCK', $1, 'UPDATE', $2, $3, $4)
      `,
      [blockId, existing, res.rows[0], authorName]
    );

    const b = res.rows[0];
    return {
      id: b.id,
      sectionId: b.section_id,
      blockType: b.block_type,
      title: b.title,
      instructions: b.instructions,
      content: b.content,
      classification: b.classification,
      dataNature: b.data_nature,
      unit: b.unit,
      isRequired: b.is_required,
      isVisiblePdf: b.is_visible_pdf,
      responsibleId: b.responsible_id,
      sourceInfo: b.source_info,
      sortOrder: b.sort_order,
      gridWidth: b.grid_width,
      metadata: b.metadata || {},
      createdAt: b.created_at.toISOString(),
      updatedAt: b.updated_at.toISOString(),
    };
  }

  static async createBlock(input: {
    sectionId: string;
    blockType: string;
    title: string;
    content?: Record<string, unknown>;
    classification?: string;
    dataNature?: string;
    unit?: string;
    instructions?: string;
    gridWidth?: number;
    sortOrder?: number;
  }): Promise<StrategyBlockRecord> {
    const res = await query(
      `
      INSERT INTO strategy_blocks (
        section_id, block_type, title, instructions, content, classification,
        data_nature, unit, grid_width, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        input.sectionId,
        input.blockType,
        input.title,
        input.instructions || null,
        input.content || {},
        input.classification || "DECLARADO",
        input.dataNature || "MANUAL",
        input.unit || null,
        input.gridWidth || 12,
        input.sortOrder || 0,
      ]
    );

    const b = res.rows[0];
    return {
      id: b.id,
      sectionId: b.section_id,
      blockType: b.block_type,
      title: b.title,
      instructions: b.instructions,
      content: b.content,
      classification: b.classification,
      dataNature: b.data_nature,
      unit: b.unit,
      isRequired: b.is_required,
      isVisiblePdf: b.is_visible_pdf,
      responsibleId: b.responsible_id,
      sourceInfo: b.source_info,
      sortOrder: b.sort_order,
      gridWidth: b.grid_width,
      metadata: b.metadata || {},
      createdAt: b.created_at.toISOString(),
      updatedAt: b.updated_at.toISOString(),
    };
  }

  static async deleteBlock(blockId: string): Promise<void> {
    await query(`DELETE FROM strategy_blocks WHERE id = $1`, [blockId]);
  }

  // ==========================================
  // METAS, ORÇAMENTOS E COMPARAÇÃO COM O ERP
  // ==========================================

  static async listGoals(): Promise<StrategyGoalRecord[]> {
    const res = await query(
      `SELECT * FROM strategy_goals ORDER BY category ASC, name ASC`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      goalType: r.goal_type,
      targetValue: r.target_value !== null ? Number(r.target_value) : null,
      targetRangeMin: r.target_range_min !== null ? Number(r.target_range_min) : null,
      targetRangeMax: r.target_range_max !== null ? Number(r.target_range_max) : null,
      unit: r.unit,
      periodType: r.period_type,
      startDate: r.start_date.toISOString().slice(0, 10),
      endDate: r.end_date ? r.end_date.toISOString().slice(0, 10) : null,
      sourceType: r.source_type,
      sourceFilters: r.source_filters || {},
      evaluationRule: r.evaluation_rule,
      tolerancePercent: Number(r.tolerance_percent || 0),
      status: r.status,
      responsibleId: r.responsible_id,
      notes: r.notes,
      metadata: r.metadata || {},
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));
  }

  /**
   * Avalia uma meta comparando o planejado com o realizado operacional no ERP.
   * CASO DE ACEITE OBRIGATÓRIO:
   * Planejado: R$ 300
   * Realizado pago no financeiro: R$ 20
   * Retorno: Execução 6.67%, Saldo não executado R$ 280, Desvio -R$ 280
   * Realizado pago R$ 350:
   * Retorno: Execução 116.67%, Excesso R$ 50, Desvio +R$ 50
   */
  static async evaluateGoal(
    goalId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<GoalComparisonResult> {
    const goalRes = await query(`SELECT * FROM strategy_goals WHERE id = $1`, [goalId]);
    if (goalRes.rowCount === 0) throw new Error("Meta não encontrada.");
    const g = goalRes.rows[0];

    const plannedAmount = g.target_value !== null ? Number(g.target_value) : null;
    const start = periodStart || g.start_date.toISOString().slice(0, 10);
    const end = periodEnd || (g.end_date ? g.end_date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

    let actualAmount = 0;
    const contributingRecords: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      type: string;
    }> = [];

    if (g.source_type === "FINANCIAL_EXPENSE") {
      // Regime de Caixa: apenas baixas efetivas pagas (financial_settlements onde receivable_id IS NULL)
      // Ignora transferências entre contas e verba de clientes
      const expenseSql = `
        SELECT 
          s.id,
          p.description,
          s.amount,
          s.settlement_date,
          c.name as category_name
        FROM financial_settlements s
        JOIN payables p ON p.id = s.payable_id
        LEFT JOIN financial_categories c ON c.id = p.category_id
        WHERE s.settlement_date >= $1 AND s.settlement_date <= $2
          AND p.is_canceled = false
          AND (c.name ILIKE '%anúncio%' OR c.name ILIKE '%mídia%' OR c.name ILIKE '%marketing%' OR p.description ILIKE '%anúncio%' OR p.description ILIKE '%ads%')
        ORDER BY s.settlement_date ASC
      `;
      const expRes = await query(expenseSql, [start, end]);
      for (const row of expRes.rows) {
        const amt = Number(row.amount);
        actualAmount += amt;
        contributingRecords.push({
          id: row.id,
          description: row.description,
          amount: amt,
          date: row.settlement_date.toISOString().slice(0, 10),
          type: "Despesa Paga (Baixa Efetiva)",
        });
      }
    } else if (g.source_type === "FINANCIAL_REVENUE") {
      // Regime de caixa em receitas recebidas
      const revSql = `
        SELECT s.id, r.description, s.amount, s.settlement_date
        FROM financial_settlements s
        JOIN receivables r ON r.id = s.receivable_id
        WHERE s.settlement_date >= $1 AND s.settlement_date <= $2
        ORDER BY s.settlement_date ASC
      `;
      const revRes = await query(revSql, [start, end]);
      for (const row of revRes.rows) {
        const amt = Number(row.amount);
        actualAmount += amt;
        contributingRecords.push({
          id: row.id,
          description: row.description,
          amount: amt,
          date: row.settlement_date.toISOString().slice(0, 10),
          type: "Receita Recebida (Baixa Efetiva)",
        });
      }
    }

    // Cálculos de execução e desvio com tratamento seguro de divisão por zero
    let executionPercent: number | null = null;
    let unexecutedBalance: number | null = null;
    let deviationAmount: number | null = null;
    let excessAmount: number | null = null;

    if (plannedAmount !== null && plannedAmount > 0) {
      executionPercent = Number(((actualAmount / plannedAmount) * 100).toFixed(2));
      deviationAmount = Number((actualAmount - plannedAmount).toFixed(2));
      unexecutedBalance = actualAmount < plannedAmount ? Number((plannedAmount - actualAmount).toFixed(2)) : 0;
      excessAmount = actualAmount > plannedAmount ? Number((actualAmount - plannedAmount).toFixed(2)) : 0;
    } else if (plannedAmount === 0) {
      executionPercent = actualAmount === 0 ? 100 : null;
      deviationAmount = actualAmount;
      unexecutedBalance = 0;
      excessAmount = actualAmount;
    }

    // Avaliação de Status conforme a Regra
    let statusEvaluation: GoalComparisonResult["statusEvaluation"] = "DENTRO_DO_PLANEJADO";
    let explanation = "";

    if (g.evaluation_rule === "COST_CEILING") {
      // Teto de Gasto: gastar até o limite é aceitável, exceder é alerta crítico
      if (plannedAmount !== null && actualAmount > plannedAmount) {
        statusEvaluation = "EXCESSO_DE_TETO";
        explanation = `O limite máximo de gastos foi superado em R$ ${excessAmount?.toFixed(2)}.`;
      } else {
        statusEvaluation = "DENTRO_DO_PLANEJADO";
        explanation = `Gastos mantidos dentro do teto estipulado de R$ ${plannedAmount?.toFixed(2)}.`;
      }
    } else if (g.evaluation_rule === "INVESTMENT_EXECUTION") {
      // Meta de Execução de Investimento (ex: anúncios da Otimizza)
      if (plannedAmount !== null && actualAmount < plannedAmount) {
        statusEvaluation = "ABAIXO_DO_ESPERADO";
        explanation = `Investimento de R$ ${actualAmount.toFixed(2)} executou apenas ${executionPercent}% do planejado de R$ ${plannedAmount.toFixed(2)}. Saldo restante de R$ ${unexecutedBalance?.toFixed(2)}.`;
      } else if (plannedAmount !== null && actualAmount > plannedAmount) {
        statusEvaluation = "ACIMA_DO_PLANEJADO";
        explanation = `Investimento executou ${executionPercent}%, superando a estimativa inicial em R$ ${excessAmount?.toFixed(2)}.`;
      } else {
        statusEvaluation = "DENTRO_DO_PLANEJADO";
        explanation = `Investimento executado exatamente no planejado de R$ ${plannedAmount?.toFixed(2)}.`;
      }
    }

    return {
      goalId: g.id,
      name: g.name,
      goalType: g.goal_type,
      evaluationRule: g.evaluation_rule,
      targetValue: plannedAmount,
      targetRangeMin: g.target_range_min !== null ? Number(g.target_range_min) : null,
      targetRangeMax: g.target_range_max !== null ? Number(g.target_range_max) : null,
      unit: g.unit,
      plannedAmount,
      actualAmount,
      executionPercent,
      unexecutedBalance,
      deviationAmount,
      excessAmount,
      statusEvaluation,
      explanation,
      contributingRecords,
    };
  }

  // ==========================================
  // FERRAMENTAS ESTRATÉGICAS (SWOT, CANVAS, ETC.)
  // ==========================================

  static async getFramework(frameworkType: string): Promise<StrategyFrameworkRecord | null> {
    const res = await query(
      `SELECT * FROM strategy_frameworks WHERE framework_type = $1 ORDER BY version DESC LIMIT 1`,
      [frameworkType]
    );
    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      frameworkType: r.framework_type,
      title: r.title,
      content: r.content || {},
      version: r.version,
      metadata: r.metadata || {},
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  static async saveFramework(
    frameworkType: string,
    title: string,
    content: Record<string, unknown>
  ): Promise<StrategyFrameworkRecord> {
    const existing = await this.getFramework(frameworkType);
    let res;
    if (existing) {
      res = await query(
        `
        UPDATE strategy_frameworks
        SET title = $1, content = $2, version = version + 1, updated_at = now()
        WHERE id = $3
        RETURNING *
        `,
        [title, content, existing.id]
      );
    } else {
      res = await query(
        `
        INSERT INTO strategy_frameworks (framework_type, title, content)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [frameworkType, title, content]
      );
    }
    const r = res.rows[0];
    return {
      id: r.id,
      frameworkType: r.framework_type,
      title: r.title,
      content: r.content,
      version: r.version,
      metadata: r.metadata || {},
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  // ==========================================
  // INICIATIVAS & AÇÕES 5W2H
  // ==========================================

  static async listInitiatives(): Promise<StrategyInitiativeRecord[]> {
    const res = await query(
      `SELECT * FROM strategy_initiatives ORDER BY priority ASC, planned_start ASC NULLS LAST`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      goalId: r.goal_id,
      projectId: r.project_id,
      status: r.status,
      priority: r.priority,
      plannedStart: r.planned_start ? r.planned_start.toISOString().slice(0, 10) : null,
      plannedEnd: r.planned_end ? r.planned_end.toISOString().slice(0, 10) : null,
      actualStart: r.actual_start ? r.actual_start.toISOString().slice(0, 10) : null,
      actualEnd: r.actual_end ? r.actual_end.toISOString().slice(0, 10) : null,
      frameworkOrigin: r.framework_origin,
      frameworkRefId: r.framework_ref_id,
      responsibleId: r.responsible_id,
      estimatedCost: Number(r.estimated_cost || 0),
      details5w2h: r.details_5w2h || {},
      metadata: r.metadata || {},
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));
  }

  static async createInitiative(input: Partial<StrategyInitiativeRecord>): Promise<StrategyInitiativeRecord> {
    const res = await query(
      `
      INSERT INTO strategy_initiatives (
        title, description, goal_id, project_id, status, priority,
        planned_start, planned_end, framework_origin, framework_ref_id,
        estimated_cost, details_5w2h
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        input.title,
        input.description || null,
        input.goalId || null,
        input.projectId || null,
        input.status || "PLANEJADA",
        input.priority || "MEDIA",
        input.plannedStart || null,
        input.plannedEnd || null,
        input.frameworkOrigin || null,
        input.frameworkRefId || null,
        input.estimatedCost || 0,
        input.details5w2h || {},
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      goalId: r.goal_id,
      projectId: r.project_id,
      status: r.status,
      priority: r.priority,
      plannedStart: r.planned_start ? r.planned_start.toISOString().slice(0, 10) : null,
      plannedEnd: r.planned_end ? r.planned_end.toISOString().slice(0, 10) : null,
      actualStart: r.actual_start ? r.actual_start.toISOString().slice(0, 10) : null,
      actualEnd: r.actual_end ? r.actual_end.toISOString().slice(0, 10) : null,
      frameworkOrigin: r.framework_origin,
      frameworkRefId: r.framework_ref_id,
      responsibleId: r.responsible_id,
      estimatedCost: Number(r.estimated_cost || 0),
      details5w2h: r.details_5w2h || {},
      metadata: r.metadata || {},
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }
}

