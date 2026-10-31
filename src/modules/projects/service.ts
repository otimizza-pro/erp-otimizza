import { query, withTransaction } from "@/lib/db/pool";
import {
  ProjectRecord,
  ProjectStageRecord,
  ProjectTaskRecord,
  ProjectChecklistRecord,
  ProjectTimeEntryRecord,
  ProjectTemplateRecord,
  ContractRecurringSettingsRecord,
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateChecklistSchema,
  CreateTimeEntrySchema,
  ConfigureContractRecurrenceSchema,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateChecklistInput,
  CreateTimeEntryInput,
  ConfigureContractRecurrenceInput,
} from "./types";
import { z } from "zod";

// ----------------------------------------------------------------------
// 1. Templates de Projetos
// ----------------------------------------------------------------------

export async function listProjectTemplates(): Promise<ProjectTemplateRecord[]> {
  const sql = `
    SELECT 
      id, code, name, description,
      estimated_days as "estimatedDays",
      estimated_hours::float as "estimatedHours",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM project_templates
    WHERE status = 'ACTIVE'
    ORDER BY name ASC
  `;
  const result = await query<ProjectTemplateRecord>(sql);
  return result.rows;
}

export async function getProjectTemplateById(id: string): Promise<ProjectTemplateRecord | null> {
  const tmplSql = `
    SELECT 
      id, code, name, description,
      estimated_days as "estimatedDays",
      estimated_hours::float as "estimatedHours",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM project_templates
    WHERE id = $1
  `;
  const tmplRes = await query<ProjectTemplateRecord>(tmplSql, [id]);
  if (tmplRes.rows.length === 0) return null;
  const template = tmplRes.rows[0];

  const stagesSql = `
    SELECT id, name, order_index as "orderIndex"
    FROM project_template_stages
    WHERE template_id = $1
    ORDER BY order_index ASC
  `;
  const stagesRes = await query<{ id: string; name: string; orderIndex: number }>(stagesSql, [id]);

  const tasksSql = `
    SELECT 
      id, stage_id as "stageId", title, description,
      relative_due_days as "relativeDueDays",
      estimated_hours::float as "estimatedHours",
      order_index as "orderIndex"
    FROM project_template_tasks
    WHERE template_id = $1
    ORDER BY order_index ASC
  `;
  const tasksRes = await query<{
    id: string;
    stageId: string | null;
    title: string;
    description: string | null;
    relativeDueDays: number;
    estimatedHours: number;
    orderIndex: number;
  }>(tasksSql, [id]);

  template.stages = stagesRes.rows.map((stg) => ({
    ...stg,
    tasks: tasksRes.rows.filter((t) => t.stageId === stg.id),
  }));

  return template;
}

// ----------------------------------------------------------------------
// 2. Projetos (CRUD & Listagens)
// ----------------------------------------------------------------------

interface ListProjectsFilter {
  clientId?: string;
  contractId?: string;
  status?: string;
  projectType?: string;
  search?: string;
}

export async function listProjects(filters: ListProjectsFilter = {}): Promise<ProjectRecord[]> {
  const conditions: string[] = ["p.archived_at IS NULL"];
  const params: unknown[] = [];

  if (filters.clientId) {
    params.push(filters.clientId);
    conditions.push(`p.client_id = $${params.length}`);
  }
  if (filters.contractId) {
    params.push(filters.contractId);
    conditions.push(`p.contract_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (filters.projectType) {
    params.push(filters.projectType);
    conditions.push(`p.project_type = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.project_number ILIKE $${params.length})`);
  }

  const sql = `
    SELECT 
      p.id,
      p.project_number as "projectNumber",
      p.name,
      p.description,
      p.project_type as "projectType",
      p.client_id as "clientId",
      c.name as "clientName",
      p.contract_id as "contractId",
      co.contract_number as "contractNumber",
      p.contract_version_id as "contractVersionId",
      p.template_id as "templateId",
      tmpl.name as "templateName",
      p.competency,
      p.status,
      p.priority,
      p.start_date as "startDate",
      p.due_date as "dueDate",
      p.completed_at as "completedAt",
      p.estimated_budget::float as "estimatedBudget",
      p.estimated_hours::float as "estimatedHours",
      p.actual_hours::float as "actualHours",
      p.estimated_cost::float as "estimatedCost",
      p.actual_cost::float as "actualCost",
      p.notes,
      p.created_at as "createdAt",
      p.updated_at as "updatedAt",
      p.archived_at as "archivedAt"
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN contracts co ON co.id = p.contract_id
    LEFT JOIN project_templates tmpl ON tmpl.id = p.template_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY p.created_at DESC
  `;

  const result = await query<ProjectRecord>(sql, params);
  return result.rows;
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const prjSql = `
    SELECT 
      p.id,
      p.project_number as "projectNumber",
      p.name,
      p.description,
      p.project_type as "projectType",
      p.client_id as "clientId",
      c.name as "clientName",
      p.contract_id as "contractId",
      co.contract_number as "contractNumber",
      p.contract_version_id as "contractVersionId",
      p.template_id as "templateId",
      tmpl.name as "templateName",
      p.competency,
      p.status,
      p.priority,
      p.start_date as "startDate",
      p.due_date as "dueDate",
      p.completed_at as "completedAt",
      p.estimated_budget::float as "estimatedBudget",
      p.estimated_hours::float as "estimatedHours",
      p.actual_hours::float as "actualHours",
      p.estimated_cost::float as "estimatedCost",
      p.actual_cost::float as "actualCost",
      p.notes,
      p.created_at as "createdAt",
      p.updated_at as "updatedAt",
      p.archived_at as "archivedAt"
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN contracts co ON co.id = p.contract_id
    LEFT JOIN project_templates tmpl ON tmpl.id = p.template_id
    WHERE p.id = $1 AND p.archived_at IS NULL
  `;
  const prjRes = await query<ProjectRecord>(prjSql, [id]);
  if (prjRes.rows.length === 0) return null;
  const project = prjRes.rows[0];

  // Etapas
  const stagesSql = `
    SELECT id, project_id as "projectId", name, order_index as "orderIndex", status, created_at as "createdAt"
    FROM project_stages
    WHERE project_id = $1
    ORDER BY order_index ASC
  `;
  const stagesRes = await query<ProjectStageRecord>(stagesSql, [id]);

  // Tarefas com checklists
  const tasksSql = `
    SELECT 
      t.id,
      t.project_id as "projectId",
      t.stage_id as "stageId",
      s.name as "stageName",
      t.task_number as "taskNumber",
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_date as "dueDate",
      t.completed_at as "completedAt",
      t.estimated_hours::float as "estimatedHours",
      t.actual_hours::float as "actualHours",
      t.order_index as "orderIndex",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt"
    FROM project_tasks t
    LEFT JOIN project_stages s ON s.id = t.stage_id
    WHERE t.project_id = $1
    ORDER BY t.order_index ASC, t.created_at ASC
  `;
  const tasksRes = await query<ProjectTaskRecord>(tasksSql, [id]);

  const checklistsSql = `
    SELECT 
      c.id,
      c.task_id as "taskId",
      c.title,
      c.is_completed as "isCompleted",
      c.order_index as "orderIndex",
      c.completed_at as "completedAt",
      c.created_at as "createdAt"
    FROM project_checklists c
    JOIN project_tasks t ON t.id = c.task_id
    WHERE t.project_id = $1
    ORDER BY c.order_index ASC
  `;
  const checklistsRes = await query<ProjectChecklistRecord>(checklistsSql, [id]);

  project.tasks = tasksRes.rows.map((t) => ({
    ...t,
    checklists: checklistsRes.rows.filter((c) => c.taskId === t.id),
  }));

  project.stages = stagesRes.rows.map((stg) => ({
    ...stg,
    tasks: project.tasks?.filter((t) => t.stageId === stg.id),
  }));

  return project;
}

export async function createProject(
  input: CreateProjectInput
): Promise<ProjectRecord> {
  const validated = CreateProjectSchema.parse(input);

  const projectId = await withTransaction(async (client) => {
    // 1. Inserir projeto
    const prjSql = `
      INSERT INTO projects (
        name, description, project_type, client_id, contract_id, contract_version_id,
        template_id, competency, status, priority, start_date, due_date,
        estimated_budget, estimated_hours, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, project_number as "projectNumber"
    `;
    const prjRes = await client.query<{ id: string; projectNumber: string }>(prjSql, [
      validated.name,
      validated.description || null,
      validated.projectType,
      validated.clientId || null,
      validated.contractId || null,
      validated.contractVersionId || null,
      validated.templateId || null,
      validated.competency || null,
      validated.status,
      validated.priority,
      validated.startDate,
      validated.dueDate,
      validated.estimatedBudget,
      validated.estimatedHours,
      validated.notes || null,
    ]);
    const projectId = prjRes.rows[0].id;

    // 2. Se houver template, clonar etapas e tarefas
    if (validated.templateId) {
      const stagesRes = await client.query<{ id: string; name: string; order_index: number }>(
        `SELECT id, name, order_index FROM project_template_stages WHERE template_id = $1 ORDER BY order_index ASC`,
        [validated.templateId]
      );

      const stageMap = new Map<string, string>(); // templateStageId -> projectStageId

      for (const stg of stagesRes.rows) {
        const insStg = await client.query<{ id: string }>(
          `INSERT INTO project_stages (project_id, name, order_index, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
          [projectId, stg.name, stg.order_index]
        );
        stageMap.set(stg.id, insStg.rows[0].id);
      }

      const tasksRes = await client.query<{
        stage_id: string | null;
        title: string;
        description: string | null;
        relative_due_days: number;
        estimated_hours: number;
        order_index: number;
      }>(
        `SELECT stage_id, title, description, relative_due_days, estimated_hours, order_index 
         FROM project_template_tasks WHERE template_id = $1 ORDER BY order_index ASC`,
        [validated.templateId]
      );

      const projStartDate = new Date(validated.startDate);

      for (const t of tasksRes.rows) {
        const newStageId = t.stage_id ? stageMap.get(t.stage_id) || null : null;
        const taskDueDate = new Date(projStartDate);
        taskDueDate.setDate(taskDueDate.getDate() + (t.relative_due_days || 0));
        const dueDateStr = taskDueDate.toISOString().substring(0, 10);

        await client.query(
          `INSERT INTO project_tasks (
            project_id, stage_id, title, description, status, priority, due_date, estimated_hours, order_index
          ) VALUES ($1, $2, $3, $4, 'TODO', 'MEDIUM', $5, $6, $7)`,
          [
            projectId,
            newStageId,
            t.title,
            t.description || null,
            dueDateStr,
            t.estimated_hours || 1,
            t.order_index,
          ]
        );
      }
    } else {
      // Criar etapas padrão para fluxo Kanban caso não tenha template
      const defaultStages = ["A Fazer", "Em Andamento", "Em Revisão", "Concluído"];
      for (let i = 0; i < defaultStages.length; i++) {
        await client.query(
          `INSERT INTO project_stages (project_id, name, order_index, status) VALUES ($1, $2, $3, 'ACTIVE')`,
          [projectId, defaultStages[i], i + 1]
        );
      }
    }

    return projectId;
  });

  const full = await getProjectById(projectId);
  if (!full) throw new Error("Erro ao carregar projeto criado.");
  return full;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<ProjectRecord> {
  const validated = UpdateProjectSchema.parse(input);

  const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const params: unknown[] = [id];

  if (validated.name !== undefined) {
    params.push(validated.name);
    updates.push(`name = $${params.length}`);
  }
  if (validated.description !== undefined) {
    params.push(validated.description);
    updates.push(`description = $${params.length}`);
  }
  if (validated.status !== undefined) {
    params.push(validated.status);
    updates.push(`status = $${params.length}`);
    if (validated.status === "COMPLETED") {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    } else {
      updates.push(`completed_at = NULL`);
    }
  }
  if (validated.priority !== undefined) {
    params.push(validated.priority);
    updates.push(`priority = $${params.length}`);
  }
  if (validated.dueDate !== undefined) {
    params.push(validated.dueDate);
    updates.push(`due_date = $${params.length}`);
  }
  if (validated.notes !== undefined) {
    params.push(validated.notes);
    updates.push(`notes = $${params.length}`);
  }

  const sql = `UPDATE projects SET ${updates.join(", ")} WHERE id = $1 RETURNING id`;
  const res = await query(sql, params);
  if (res.rows.length === 0) throw new Error("Projeto não encontrado.");

  const updated = await getProjectById(id);
  if (!updated) throw new Error("Erro ao obter projeto atualizado.");
  return updated;
}

export async function archiveProject(id: string): Promise<void> {
  await query(
    `UPDATE projects SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}

// ----------------------------------------------------------------------
// 3. Etapas & Tarefas (Kanban & Checklists)
// ----------------------------------------------------------------------

export async function createProjectStage(
  projectId: string,
  name: string,
  orderIndex = 1
): Promise<ProjectStageRecord> {
  const sql = `
    INSERT INTO project_stages (project_id, name, order_index, status)
    VALUES ($1, $2, $3, 'ACTIVE')
    RETURNING id, project_id as "projectId", name, order_index as "orderIndex", status, created_at as "createdAt"
  `;
  const res = await query<ProjectStageRecord>(sql, [projectId, name.trim(), orderIndex]);
  return res.rows[0];
}

export async function createProjectTask(
  input: CreateTaskInput
): Promise<ProjectTaskRecord> {
  const validated = CreateTaskSchema.parse(input);

  const sql = `
    INSERT INTO project_tasks (
      project_id, stage_id, title, description, status, priority, due_date, estimated_hours, order_index
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING 
      id, project_id as "projectId", stage_id as "stageId", task_number as "taskNumber",
      title, description, status, priority, due_date as "dueDate", completed_at as "completedAt",
      estimated_hours::float as "estimatedHours", actual_hours::float as "actualHours",
      order_index as "orderIndex", created_at as "createdAt", updated_at as "updatedAt"
  `;
  const res = await query<ProjectTaskRecord>(sql, [
    validated.projectId,
    validated.stageId || null,
    validated.title,
    validated.description || null,
    validated.status,
    validated.priority,
    validated.dueDate || null,
    validated.estimatedHours,
    validated.orderIndex,
  ]);
  return res.rows[0];
}

export async function updateProjectTask(
  id: string,
  input: UpdateTaskInput
): Promise<ProjectTaskRecord> {
  const validated = UpdateTaskSchema.parse(input);

  const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const params: unknown[] = [id];

  if (validated.title !== undefined) {
    params.push(validated.title);
    updates.push(`title = $${params.length}`);
  }
  if (validated.description !== undefined) {
    params.push(validated.description);
    updates.push(`description = $${params.length}`);
  }
  if (validated.stageId !== undefined) {
    params.push(validated.stageId);
    updates.push(`stage_id = $${params.length}`);
  }
  if (validated.status !== undefined) {
    params.push(validated.status);
    updates.push(`status = $${params.length}`);
    if (validated.status === "DONE") {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    } else {
      updates.push(`completed_at = NULL`);
    }
  }
  if (validated.priority !== undefined) {
    params.push(validated.priority);
    updates.push(`priority = $${params.length}`);
  }
  if (validated.dueDate !== undefined) {
    params.push(validated.dueDate);
    updates.push(`due_date = $${params.length}`);
  }
  if (validated.estimatedHours !== undefined) {
    params.push(validated.estimatedHours);
    updates.push(`estimated_hours = $${params.length}`);
  }
  if (validated.orderIndex !== undefined) {
    params.push(validated.orderIndex);
    updates.push(`order_index = $${params.length}`);
  }

  const sql = `
    UPDATE project_tasks 
    SET ${updates.join(", ")} 
    WHERE id = $1
    RETURNING 
      id, project_id as "projectId", stage_id as "stageId", task_number as "taskNumber",
      title, description, status, priority, due_date as "dueDate", completed_at as "completedAt",
      estimated_hours::float as "estimatedHours", actual_hours::float as "actualHours",
      order_index as "orderIndex", created_at as "createdAt", updated_at as "updatedAt"
  `;
  const res = await query<ProjectTaskRecord>(sql, params);
  if (res.rows.length === 0) throw new Error("Tarefa não encontrada.");
  return res.rows[0];
}

export async function deleteProjectTask(id: string): Promise<void> {
  await query(`DELETE FROM project_tasks WHERE id = $1`, [id]);
}

// ----------------------------------------------------------------------
// 4. Checklists de Tarefas
// ----------------------------------------------------------------------

export async function addChecklistItem(
  input: CreateChecklistInput
): Promise<ProjectChecklistRecord> {
  const validated = CreateChecklistSchema.parse(input);

  const sql = `
    INSERT INTO project_checklists (task_id, title, order_index, is_completed)
    VALUES ($1, $2, $3, false)
    RETURNING 
      id, task_id as "taskId", title, is_completed as "isCompleted",
      order_index as "orderIndex", completed_at as "completedAt", created_at as "createdAt"
  `;
  const res = await query<ProjectChecklistRecord>(sql, [
    validated.taskId,
    validated.title,
    validated.orderIndex,
  ]);
  return res.rows[0];
}

export async function toggleChecklistItem(
  id: string,
  isCompleted: boolean
): Promise<ProjectChecklistRecord> {
  const sql = `
    UPDATE project_checklists
    SET 
      is_completed = $2,
      completed_at = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = $1
    RETURNING 
      id, task_id as "taskId", title, is_completed as "isCompleted",
      order_index as "orderIndex", completed_at as "completedAt", created_at as "createdAt"
  `;
  const res = await query<ProjectChecklistRecord>(sql, [id, isCompleted]);
  if (res.rows.length === 0) throw new Error("Item de checklist não encontrado.");
  return res.rows[0];
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await query(`DELETE FROM project_checklists WHERE id = $1`, [id]);
}

// ----------------------------------------------------------------------
// 5. Apontamento de Horas e Custos Operacionais
// ----------------------------------------------------------------------

export async function addProjectTimeEntry(
  input: CreateTimeEntryInput
): Promise<ProjectTimeEntryRecord> {
  const validated = CreateTimeEntrySchema.parse(input);
  const calculatedCost = Math.round(validated.hours * validated.hourlyRate * 100) / 100;

  return await withTransaction(async (client) => {
    const sql = `
      INSERT INTO project_time_entries (
        project_id, task_id, entry_date, hours, description, hourly_rate, calculated_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, project_id as "projectId", task_id as "taskId", entry_date as "entryDate",
        hours::float as hours, description, hourly_rate::float as "hourlyRate",
        calculated_cost::float as "calculatedCost", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await client.query<ProjectTimeEntryRecord>(sql, [
      validated.projectId,
      validated.taskId || null,
      validated.entryDate,
      validated.hours,
      validated.description,
      validated.hourlyRate,
      calculatedCost,
    ]);
    const entry = res.rows[0];

    // Atualizar total de horas e custos no projeto
    await client.query(
      `UPDATE projects 
       SET 
         actual_hours = actual_hours + $2,
         actual_cost = actual_cost + $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [validated.projectId, validated.hours, calculatedCost]
    );

    // Se houver tarefa vinculada, atualizar nela também
    if (validated.taskId) {
      await client.query(
        `UPDATE project_tasks 
         SET 
           actual_hours = actual_hours + $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [validated.taskId, validated.hours]
      );
    }

    return entry;
  });
}

export async function getProjectTimeEntries(projectId: string): Promise<ProjectTimeEntryRecord[]> {
  const sql = `
    SELECT 
      te.id,
      te.project_id as "projectId",
      te.task_id as "taskId",
      t.title as "taskTitle",
      te.entry_date as "entryDate",
      te.hours::float as hours,
      te.description,
      te.hourly_rate::float as "hourlyRate",
      te.calculated_cost::float as "calculatedCost",
      te.created_at as "createdAt",
      te.updated_at as "updatedAt"
    FROM project_time_entries te
    LEFT JOIN project_tasks t ON t.id = te.task_id
    WHERE te.project_id = $1
    ORDER BY te.entry_date DESC, te.created_at DESC
  `;
  const res = await query<ProjectTimeEntryRecord>(sql, [projectId]);
  return res.rows;
}

// ----------------------------------------------------------------------
// 6. Recorrência Operacional por Contrato
// ----------------------------------------------------------------------

export async function getContractRecurrenceSettings(
  contractId: string
): Promise<ContractRecurringSettingsRecord | null> {
  const sql = `
    SELECT 
      s.id,
      s.contract_id as "contractId",
      s.is_enabled as "isEnabled",
      s.template_id as "templateId",
      t.name as "templateName",
      s.periodicity,
      s.start_day as "startDay",
      s.duration_days as "durationDays",
      s.start_date as "startDate",
      s.end_date as "endDate",
      s.is_suspended as "isSuspended",
      s.created_at as "createdAt",
      s.updated_at as "updatedAt"
    FROM contract_project_recurring_settings s
    LEFT JOIN project_templates t ON t.id = s.template_id
    WHERE s.contract_id = $1
  `;
  const res = await query<ContractRecurringSettingsRecord>(sql, [contractId]);
  return res.rows[0] || null;
}

export async function saveContractRecurrenceSettings(
  input: ConfigureContractRecurrenceInput
): Promise<ContractRecurringSettingsRecord> {
  const validated = ConfigureContractRecurrenceSchema.parse(input);

  const sql = `
    INSERT INTO contract_project_recurring_settings (
      contract_id, is_enabled, template_id, periodicity, start_day, duration_days, start_date, end_date, is_suspended
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (contract_id) DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      template_id = EXCLUDED.template_id,
      periodicity = EXCLUDED.periodicity,
      start_day = EXCLUDED.start_day,
      duration_days = EXCLUDED.duration_days,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      is_suspended = EXCLUDED.is_suspended,
      updated_at = CURRENT_TIMESTAMP
    RETURNING 
      id, contract_id as "contractId", is_enabled as "isEnabled", template_id as "templateId",
      periodicity, start_day as "startDay", duration_days as "durationDays",
      start_date as "startDate", end_date as "endDate", is_suspended as "isSuspended",
      created_at as "createdAt", updated_at as "updatedAt"
  `;
  const res = await query<ContractRecurringSettingsRecord>(sql, [
    validated.contractId,
    validated.isEnabled,
    validated.templateId,
    validated.periodicity,
    validated.startDay,
    validated.durationDays,
    validated.startDate,
    validated.endDate || null,
    validated.isSuspended,
  ]);
  return res.rows[0];
}

export async function generateRecurringProjectForContract(input: {
  contractId: string;
  competency: string; // YYYY-MM
  forceManual?: boolean;
}): Promise<{ project: ProjectRecord; status: "CREATED" | "ALREADY_EXISTS" }> {
  const { contractId, competency, forceManual = false } = input;

  // 1. Validar contrato
  const contractRes = await query<{
    id: string;
    contract_number: string;
    client_id: string;
    client_name: string;
    status: string;
  }>(
    `SELECT c.id, c.contract_number, c.client_id, cl.name as client_name, c.status
     FROM contracts c
     JOIN clients cl ON cl.id = c.client_id
     WHERE c.id = $1`,
    [contractId]
  );

  if (contractRes.rows.length === 0) {
    throw new Error("Contrato não encontrado para geração de projeto.");
  }
  const contract = contractRes.rows[0];

  if (contract.status !== "ACTIVE" && !forceManual) {
    throw new Error(`Contrato ${contract.contract_number} está com status '${contract.status}', impossível gerar projeto recorrente.`);
  }

  // 2. Verificar configurações de recorrência do contrato
  const settings = await getContractRecurrenceSettings(contractId);
  if (!settings && !forceManual) {
    throw new Error(`Geração recorrente de projetos não está configurada para o contrato ${contract.contract_number}.`);
  }
  if (settings && (!settings.isEnabled || settings.isSuspended) && !forceManual) {
    throw new Error(`Geração recorrente de projetos está desativada ou suspensa para o contrato ${contract.contract_number}.`);
  }

  // 3. IDEMPOTÊNCIA ESTRITA: Verificar se já existe projeto para (contract_id, competency)
  const existingRes = await query<{ id: string }>(
    `SELECT id FROM projects WHERE contract_id = $1 AND competency = $2 AND status <> 'CANCELED'`,
    [contractId, competency]
  );

  if (existingRes.rows.length > 0) {
    const existingProject = await getProjectById(existingRes.rows[0].id);
    if (!existingProject) throw new Error("Erro ao carregar projeto existente.");

    // Registrar no histórico como pulado por duplicidade existente
    await query(
      `INSERT INTO project_generation_history (contract_id, project_id, competency, status, notes)
       VALUES ($1, $2, $3, 'SKIPPED_ALREADY_EXISTS', 'Projeto para esta competência já existe e foi preservado sem duplicação.')
       ON CONFLICT (contract_id, competency) DO NOTHING`,
      [contractId, existingProject.id, competency]
    );

    return { project: existingProject, status: "ALREADY_EXISTS" };
  }

  // 4. Determinar Template, Datas de Início e Término
  let templateId = settings?.templateId;
  if (!templateId) {
    // Buscar template padrão de tráfego se não informado
    const tmplRes = await query<{ id: string }>(
      `SELECT id FROM project_templates WHERE code = 'TMPL-TRAFEGO' LIMIT 1`
    );
    templateId = tmplRes.rows[0]?.id;
  }

  const [yStr, mStr] = competency.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const startDay = settings?.startDay || 1;
  const startDateStr = `${competency}-${String(startDay).padStart(2, "0")}`;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const dueDateStr = `${competency}-${String(lastDayOfMonth).padStart(2, "0")}`;

  const template = templateId ? await getProjectTemplateById(templateId) : null;
  const projectName = `${contract.client_name} - ${template?.name || "Operação Mensal"} (${competency})`;

  // 5. Criar Projeto com clonagem de etapas e tarefas
  const createdProject = await createProject({
    name: projectName,
    description: `Projeto recorrente da competência ${competency} gerado para o contrato ${contract.contract_number}.`,
    projectType: "RECURRING",
    clientId: contract.client_id,
    contractId: contract.id,
    templateId: templateId || null,
    competency,
    status: "PLANNED",
    priority: "MEDIUM",
    startDate: startDateStr,
    dueDate: dueDateStr,
    estimatedHours: template?.estimatedHours || 20,
    estimatedBudget: 0,
    notes: `Gerado automaticamente pelo motor de recorrência operacional do ERP.`,
  });

  // 6. Registrar histórico de geração com sucesso
  await query(
    `INSERT INTO project_generation_history (contract_id, project_id, competency, status, notes)
     VALUES ($1, $2, $3, 'SUCCESS', 'Projeto recorrente criado com sucesso com clonagem de etapas e tarefas.')
     ON CONFLICT (contract_id, competency) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       status = 'SUCCESS',
       notes = EXCLUDED.notes`,
    [contractId, createdProject.id, competency]
  );

  return { project: createdProject, status: "CREATED" };
}
