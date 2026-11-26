import { query, withTransaction } from "@/lib/db/pool";
import type {
  CreateProductionTaskInput,
  RescheduleProductionTaskInput,
  UpdateProductionTaskInput,
} from "./schemas";
import type { ProductionTaskMetrics, ProductionTaskRecord } from "./types";

export interface ProductionTaskListFilters {
  status?: string;
  taskType?: string;
  clientId?: string;
  projectId?: string;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
  archived?: boolean;
  highlightId?: string;
  limit?: number;
  offset?: number;
}

const BASE_SELECT = `
  SELECT
    pt.id,
    pt.client_id AS "clientId",
    COALESCE(NULLIF(cl.trade_name, ''), cl.name) AS "clientName",
    pt.project_id AS "projectId",
    p.name AS "projectName",
    pt.project_task_id AS "projectTaskId",
    t.title AS "projectTaskTitle",
    t.task_number AS "projectTaskNumber",
    pt.checklist_item_id AS "checklistItemId",
    pc.title AS "checklistTitle",
    pt.task_type AS "taskType",
    pt.title,
    pt.description,
    pt.status,
    pt.due_date::text AS "dueDate",
    pt.completed_at::text AS "completedAt",
    pt.reschedule_count AS "rescheduleCount",
    pt.reschedule_reason AS "rescheduleReason",
    pt.reschedule_history AS "rescheduleHistory",
    pt.archived_at::text AS "archivedAt",
    pt.created_at::text AS "createdAt",
    pt.updated_at::text AS "updatedAt"
  FROM public.production_tasks pt
  LEFT JOIN public.clients cl ON cl.id = pt.client_id
  LEFT JOIN public.projects p ON p.id = pt.project_id
  LEFT JOIN public.project_tasks t ON t.id = pt.project_task_id
  LEFT JOIN public.project_checklists pc ON pc.id = pt.checklist_item_id
`;

export async function listProductionTasks(
  filters: ProductionTaskListFilters = {},
): Promise<{ items: ProductionTaskRecord[]; metrics: ProductionTaskMetrics; total: number }> {
  const conditions: string[] = [
    filters.archived ? "pt.archived_at IS NOT NULL" : "pt.archived_at IS NULL",
  ];
  const params: unknown[] = [];

  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "OVERDUE") {
      conditions.push(`pt.status IN ('PENDING', 'RESCHEDULED') AND pt.due_date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date`);
    } else if (filters.status === "TODAY") {
      conditions.push(`pt.status IN ('PENDING', 'RESCHEDULED') AND pt.due_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date`);
    } else {
      params.push(filters.status);
      conditions.push(`pt.status = $${params.length}`);
    }
  }

  if (filters.taskType && filters.taskType !== "ALL") {
    params.push(filters.taskType);
    conditions.push(`pt.task_type = $${params.length}`);
  }

  if (filters.clientId && filters.clientId !== "ALL") {
    params.push(filters.clientId);
    conditions.push(`pt.client_id = $${params.length}`);
  }

  if (filters.projectId && filters.projectId !== "ALL") {
    params.push(filters.projectId);
    conditions.push(`pt.project_id = $${params.length}`);
  }

  if (filters.dueFrom) {
    params.push(filters.dueFrom);
    conditions.push(`pt.due_date >= $${params.length}::date`);
  }

  if (filters.dueTo) {
    params.push(filters.dueTo);
    conditions.push(`pt.due_date <= $${params.length}::date`);
  }

  if (filters.search && filters.search.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(pt.title ILIKE $${params.length} OR COALESCE(pt.description, '') ILIKE $${params.length} OR COALESCE(cl.trade_name, cl.name, '') ILIKE $${params.length} OR COALESCE(p.name, '') ILIKE $${params.length})`,
    );
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const limit = Math.min(200, Math.max(1, filters.limit ?? 100));
  const offset = Math.max(0, filters.offset ?? 0);

  const metricsConditions: string[] = [
    filters.archived ? "pt.archived_at IS NOT NULL" : "pt.archived_at IS NULL",
  ];
  const metricsParams: unknown[] = [];
  if (filters.clientId && filters.clientId !== "ALL") {
    metricsParams.push(filters.clientId);
    metricsConditions.push(`pt.client_id = $${metricsParams.length}`);
  }
  const metricsWhere = `WHERE ${metricsConditions.join(" AND ")}`;

  const [itemsRes, countRes, metricsRes] = await Promise.all([
    query<ProductionTaskRecord>(
      `${BASE_SELECT} ${where}
       ORDER BY
         CASE WHEN pt.id = $${params.length + 1}::uuid THEN 0 ELSE 1 END,
         CASE WHEN pt.status IN ('PENDING', 'RESCHEDULED') THEN 0 ELSE 1 END,
         pt.due_date ASC NULLS LAST,
         pt.created_at DESC
       LIMIT $${params.length + 2} OFFSET $${params.length + 3}`,
      [...params, filters.highlightId || "00000000-0000-0000-0000-000000000000", limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM public.production_tasks pt
       LEFT JOIN public.clients cl ON cl.id = pt.client_id
       LEFT JOIN public.projects p ON p.id = pt.project_id
       ${where}`,
      params,
    ),
    query<{
      pending: string;
      overdue: string;
      today: string;
      rescheduled: string;
      completed: string;
      total: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE pt.status = 'PENDING')::text AS pending,
         COUNT(*) FILTER (WHERE pt.status IN ('PENDING', 'RESCHEDULED') AND pt.due_date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)::text AS overdue,
         COUNT(*) FILTER (WHERE pt.status IN ('PENDING', 'RESCHEDULED') AND pt.due_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)::text AS today,
         COUNT(*) FILTER (WHERE pt.status = 'RESCHEDULED')::text AS rescheduled,
         COUNT(*) FILTER (WHERE pt.status = 'COMPLETED')::text AS completed,
         COUNT(*)::text AS total
       FROM public.production_tasks pt
       ${metricsWhere}`,
      metricsParams,
    ),
  ]);

  const m = metricsRes.rows[0];
  return {
    items: itemsRes.rows,
    total: Number(countRes.rows[0]?.count || 0),
    metrics: {
      pending: Number(m?.pending || 0),
      overdue: Number(m?.overdue || 0),
      today: Number(m?.today || 0),
      rescheduled: Number(m?.rescheduled || 0),
      completed: Number(m?.completed || 0),
      total: Number(m?.total || 0),
    },
  };
}

export async function createProductionTask(
  input: CreateProductionTaskInput,
): Promise<ProductionTaskRecord> {
  try {
    const res = await query<{ id: string }>(
      `INSERT INTO public.production_tasks (
         client_id, project_id, project_task_id, checklist_item_id,
         task_type, title, description, due_date, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
       RETURNING id`,
      [
        input.clientId || null,
        input.projectId || null,
        input.projectTaskId || null,
        input.checklistItemId || null,
        input.taskType || "OTHER",
        input.title,
        input.description || null,
        input.dueDate || null,
      ],
    );
    const full = await query<ProductionTaskRecord>(`${BASE_SELECT} WHERE pt.id = $1`, [res.rows[0].id]);
    return full.rows[0];
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === "23505") {
      throw new Error("Este item de checklist já possui uma tarefa de produção ativa vinculada.");
    }
    throw err;
  }
}

export async function completeProductionTask(id: string): Promise<ProductionTaskRecord> {
  return withTransaction(async (db) => {
    const res = await db.query<{ id: string; checklistItemId: string | null }>(
      `UPDATE public.production_tasks
       SET status = 'COMPLETED',
           completed_at = COALESCE(completed_at, NOW()),
           updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL
       RETURNING id, checklist_item_id AS "checklistItemId"`,
      [id],
    );
    if (!res.rows.length) throw new Error("Tarefa de produção não encontrada.");

    const checklistId = res.rows[0].checklistItemId;
    if (checklistId) {
      await db.query(
        `UPDATE public.project_checklists
         SET is_completed = true,
             completed_at = COALESCE(completed_at, NOW())
         WHERE id = $1`,
        [checklistId],
      );
    }

    const full = await db.query<ProductionTaskRecord>(`${BASE_SELECT} WHERE pt.id = $1`, [id]);
    return full.rows[0];
  });
}

export async function rescheduleProductionTask(
  id: string,
  input: RescheduleProductionTaskInput,
): Promise<ProductionTaskRecord> {
  return withTransaction(async (db) => {
    const current = await db.query<{ dueDate: string | null }>(
      `SELECT due_date::text AS "dueDate" FROM public.production_tasks WHERE id = $1 AND archived_at IS NULL FOR UPDATE`,
      [id],
    );
    if (!current.rows.length) throw new Error("Tarefa de produção não encontrada.");

    const entry = {
      from: current.rows[0].dueDate,
      to: input.newDueDate,
      reason: input.reason,
      at: new Date().toISOString(),
    };

    await db.query(
      `UPDATE public.production_tasks
       SET due_date = $2::date,
           status = 'RESCHEDULED',
           reschedule_count = reschedule_count + 1,
           reschedule_reason = $3,
           reschedule_history = COALESCE(reschedule_history, '[]'::jsonb) || $4::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [id, input.newDueDate, input.reason, JSON.stringify([entry])],
    );

    const full = await db.query<ProductionTaskRecord>(`${BASE_SELECT} WHERE pt.id = $1`, [id]);
    return full.rows[0];
  });
}

export async function updateProductionTask(
  id: string,
  input: UpdateProductionTaskInput,
): Promise<ProductionTaskRecord> {
  const sets: string[] = [];
  const params: unknown[] = [id];

  if (input.clientId !== undefined) {
    params.push(input.clientId);
    sets.push(`client_id = $${params.length}`);
  }
  if (input.projectId !== undefined) {
    params.push(input.projectId);
    sets.push(`project_id = $${params.length}`);
  }
  if (input.taskType !== undefined) {
    params.push(input.taskType);
    sets.push(`task_type = $${params.length}`);
  }
  if (input.title !== undefined) {
    params.push(input.title);
    sets.push(`title = $${params.length}`);
  }
  if (input.description !== undefined) {
    params.push(input.description);
    sets.push(`description = $${params.length}`);
  }
  if (input.status !== undefined) {
    params.push(input.status);
    sets.push(`status = $${params.length}`);
  }
  if (input.dueDate !== undefined) {
    params.push(input.dueDate);
    sets.push(`due_date = $${params.length}::date`);
  }
  if (input.archived !== undefined) {
    sets.push(input.archived ? `archived_at = NOW()` : `archived_at = NULL`);
  }

  if (sets.length > 0) {
    sets.push(`updated_at = NOW()`);
    const updated = await query(
      `UPDATE public.production_tasks SET ${sets.join(", ")} WHERE id = $1 RETURNING id`,
      params,
    );
    if (!updated.rows.length) throw new Error("Tarefa de produção não encontrada.");
  }

  const full = await query<ProductionTaskRecord>(`${BASE_SELECT} WHERE pt.id = $1`, [id]);
  if (!full.rows.length) throw new Error("Tarefa de produção não encontrada.");
  return full.rows[0];
}

export async function deleteProductionTask(id: string): Promise<void> {
  const res = await query(`DELETE FROM public.production_tasks WHERE id = $1 RETURNING id`, [id]);
  if (!res.rows.length) throw new Error("Tarefa de produção não encontrada.");
}
