import { query } from "@/lib/db/pool";
import { NotificationService } from "./service";

let lastSyncTimestamp = 0;
const SYNC_THROTTLE_MS = 60_000;

function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function formatMoneyBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDateBr(isoDate: string): string {
  const clean = isoDate.slice(0, 10);
  const [y, m, d] = clean.split("-");
  return y && m && d ? `${d}/${m}/${y}` : clean;
}

/**
 * Synchronizes operational ERP alerts into system_notifications idempotently using dedup_key.
 * Covers overdue/due-today receivables & payables, project tasks & deadlines, expiring contracts,
 * proposals awaiting return/expired, overdue/today CRM activities, scheduled content posts,
 * and completed client briefings awaiting review.
 */
export async function syncOperationalAlerts(force = false): Promise<{ synced: boolean; generatedCount: number }> {
  const now = Date.now();
  if (!force && now - lastSyncTimestamp < SYNC_THROTTLE_MS) {
    return { synced: false, generatedCount: 0 };
  }
  lastSyncTimestamp = now;

  const today = todaySaoPaulo();
  let generatedCount = 0;

  try {
    const [
      receivablesRes,
      payablesRes,
      tasksRes,
      contractsRes,
      proposalsRes,
      activitiesRes,
      contentRes,
      briefingsRes,
    ] = await Promise.all([
      query<{
        id: string;
        receivable_number: string;
        description: string;
        client_name: string;
        balance_amount: string;
        due_date: string;
      }>(
        `SELECT r.id, r.receivable_number, r.description,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name) AS client_name,
                r.balance_amount::text, r.due_date::text
         FROM receivables r
         JOIN clients cl ON cl.id = r.client_id
         WHERE r.status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID')
           AND r.due_date <= $1::date
         ORDER BY r.due_date ASC
         LIMIT 12`,
        [today]
      ),
      query<{
        id: string;
        payable_number: string;
        description: string;
        supplier_name: string | null;
        balance_amount: string;
        due_date: string;
      }>(
        `SELECT p.id, p.payable_number, p.description, p.supplier_name,
                p.balance_amount::text, p.due_date::text
         FROM payables p
         WHERE p.status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID')
           AND p.due_date <= ($1::date + INTERVAL '2 days')::date
         ORDER BY p.due_date ASC
         LIMIT 12`,
        [today]
      ),
      query<{
        id: string;
        project_id: string;
        title: string;
        project_name: string;
        due_date: string;
      }>(
        `SELECT t.id, t.project_id, t.title, p.name AS project_name, t.due_date::text
         FROM project_tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE p.archived_at IS NULL
           AND p.status NOT IN ('COMPLETED', 'CANCELED')
           AND t.status NOT IN ('DONE', 'CANCELED')
           AND t.due_date IS NOT NULL
           AND t.due_date <= $1::date
         ORDER BY t.due_date ASC
         LIMIT 12`,
        [today]
      ),
      query<{
        id: string;
        contract_number: string;
        client_name: string;
        end_date: string;
      }>(
        `SELECT c.id, c.contract_number,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name) AS client_name,
                cv.end_date::text
         FROM contracts c
         JOIN clients cl ON cl.id = c.client_id
         JOIN LATERAL (
           SELECT end_date, is_indefinite
           FROM contract_versions
           WHERE contract_id = c.id
           ORDER BY version_number DESC
           LIMIT 1
         ) cv ON true
         WHERE c.archived_at IS NULL
           AND c.status = 'ACTIVE'
           AND cv.is_indefinite = false
           AND cv.end_date IS NOT NULL
           AND cv.end_date BETWEEN $1::date AND ($1::date + INTERVAL '30 days')::date
         ORDER BY cv.end_date ASC
         LIMIT 10`,
        [today]
      ),
      query<{
        id: string;
        proposal_code: string;
        title: string;
        valid_until: string;
        status: string;
      }>(
        `SELECT p.id, p.proposal_code, p.title, p.valid_until::text, p.status
         FROM proposals p
         WHERE p.archived_at IS NULL
           AND p.status IN ('SENT', 'NEGOTIATING')
           AND p.valid_until IS NOT NULL
           AND p.valid_until <= ($1::date + INTERVAL '3 days')::date
         ORDER BY p.valid_until ASC
         LIMIT 10`,
        [today]
      ),
      query<{
        id: string;
        title: string;
        due_date: string;
        activity_type: string;
      }>(
        `SELECT a.id, a.title, a.due_date::date::text AS due_date, a.activity_type
         FROM crm_activities a
         WHERE a.archived_at IS NULL
           AND a.status IN ('PENDING', 'RESCHEDULED')
           AND a.due_date IS NOT NULL
           AND (a.due_date AT TIME ZONE 'America/Sao_Paulo')::date <= $1::date
         ORDER BY a.due_date ASC
         LIMIT 10`,
        [today]
      ),
      query<{
        id: string;
        title: string;
        scheduled_date: string;
        status: string;
        client_id: string;
        company_name: string;
      }>(
        `SELECT c.id, c.title, c.scheduled_date::text, c.status, c.client_id,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name) AS company_name
         FROM content_calendar_items c
         JOIN clients cl ON cl.id = c.client_id
         WHERE c.archived_at IS NULL
           AND c.status NOT IN ('PUBLISHED')
           AND c.scheduled_date IS NOT NULL
           AND c.scheduled_date <= $1::date
         ORDER BY c.scheduled_date ASC
         LIMIT 10`,
        [today]
      ),
      query<{
        id: string;
        project_id: string;
        company_name: string;
        completed_at: string;
      }>(
        `SELECT bs.id, bs.project_id, bs.company_name, bs.completed_at::text
         FROM client_briefing_sessions bs
         JOIN projects p ON p.id = bs.project_id
         WHERE p.archived_at IS NULL
           AND bs.status = 'COMPLETED'
           AND bs.completed_at >= NOW() - INTERVAL '7 days'
         ORDER BY bs.completed_at DESC
         LIMIT 8`
      ),
    ]);

    const notifications: Array<Parameters<typeof NotificationService.createSafeNotification>[0]> = [];

    for (const r of receivablesRes.rows) {
      const overdue = r.due_date.slice(0, 10) < today;
      notifications.push({
        dedupKey: `receivable:${r.id}:${today}`,
        type: overdue ? "RECEIVABLE_OVERDUE" : "RECEIVABLE_DUE_TODAY",
        severity: overdue ? "critical" : "warning",
        category: "FINANCIAL",
        entityType: "receivable",
        entityId: r.id,
        title: overdue
          ? `Recebimento em atraso (${r.receivable_number})`
          : `Recebimento vence hoje (${r.receivable_number})`,
        message: `${r.client_name} · ${formatMoneyBrl(Number(r.balance_amount))} · vencimento ${formatDateBr(r.due_date)}`,
        linkUrl: `/financial/receivables/${r.id}`,
        metadata: { amount: Number(r.balance_amount), dueDate: r.due_date.slice(0, 10) },
      });
    }

    for (const p of payablesRes.rows) {
      const due = p.due_date.slice(0, 10);
      const overdue = due < today;
      const isToday = due === today;
      notifications.push({
        dedupKey: `payable:${p.id}:${today}`,
        type: overdue ? "PAYABLE_OVERDUE" : "PAYABLE_UPCOMING",
        severity: overdue ? "critical" : isToday ? "warning" : "info",
        category: "FINANCIAL",
        entityType: "payable",
        entityId: p.id,
        title: overdue
          ? `Conta a pagar atrasada (${p.payable_number})`
          : isToday
          ? `Conta a pagar vence hoje (${p.payable_number})`
          : `Conta a pagar vence em ${formatDateBr(due)}`,
        message: `${p.supplier_name || p.description} · ${formatMoneyBrl(Number(p.balance_amount))}`,
        linkUrl: `/financial/payables/${p.id}`,
        metadata: { amount: Number(p.balance_amount), dueDate: due },
      });
    }

    for (const t of tasksRes.rows) {
      const overdue = t.due_date.slice(0, 10) < today;
      notifications.push({
        dedupKey: `task:${t.id}:${today}`,
        type: overdue ? "TASK_OVERDUE" : "TASK_DUE_TODAY",
        severity: overdue ? "warning" : "info",
        category: "PROJECTS",
        entityType: "project_task",
        entityId: t.id,
        title: overdue ? `Tarefa atrasada: ${t.title}` : `Tarefa para hoje: ${t.title}`,
        message: `Projeto ${t.project_name} · prazo ${formatDateBr(t.due_date)}`,
        linkUrl: `/projects/${t.project_id}`,
        metadata: { projectId: t.project_id, dueDate: t.due_date.slice(0, 10) },
      });
    }

    for (const c of contractsRes.rows) {
      notifications.push({
        dedupKey: `contract-expiring:${c.id}:${c.end_date.slice(0, 7)}`,
        type: "CONTRACT_EXPIRING",
        severity: "warning",
        category: "COMMERCIAL",
        entityType: "contract",
        entityId: c.id,
        title: `Contrato próximo do vencimento (${c.contract_number})`,
        message: `${c.client_name} · vigência encerra em ${formatDateBr(c.end_date)}`,
        linkUrl: `/contracts/${c.id}`,
      });
    }

    for (const pr of proposalsRes.rows) {
      const expired = pr.valid_until.slice(0, 10) < today;
      notifications.push({
        dedupKey: `proposal:${pr.id}:${expired ? "expired" : today}`,
        type: expired ? "PROPOSAL_EXPIRED" : "PROPOSAL_EXPIRING",
        severity: expired ? "warning" : "info",
        category: "COMMERCIAL",
        entityType: "proposal",
        entityId: pr.id,
        title: expired
          ? `Proposta expirada (${pr.proposal_code})`
          : `Proposta próxima do vencimento (${pr.proposal_code})`,
        message: `${pr.title} · validade ${formatDateBr(pr.valid_until)}`,
        linkUrl: `/proposals/${pr.id}`,
      });
    }

    for (const a of activitiesRes.rows) {
      const overdue = a.due_date.slice(0, 10) < today;
      notifications.push({
        dedupKey: `crm-activity:${a.id}:${today}`,
        type: overdue ? "CRM_ACTIVITY_OVERDUE" : "CRM_ACTIVITY_TODAY",
        severity: overdue ? "warning" : "info",
        category: "CRM",
        entityType: "crm_activity",
        entityId: a.id,
        title: overdue ? `Follow-up CRM atrasado: ${a.title}` : `Follow-up CRM hoje: ${a.title}`,
        message: `Atividade (${a.activity_type}) prevista para ${formatDateBr(a.due_date)}`,
        linkUrl: "/crm/activities",
      });
    }

    for (const item of contentRes.rows) {
      const overdue = item.scheduled_date.slice(0, 10) < today;
      notifications.push({
        dedupKey: `content-due:${item.id}:${today}`,
        type: overdue ? "CONTENT_OVERDUE" : "CONTENT_DUE_TODAY",
        severity: overdue ? "warning" : "info",
        category: "CONTENT",
        entityType: "content_calendar_item",
        entityId: item.id,
        title: overdue
          ? `Conteúdo pendente de publicação (${item.company_name})`
          : `Conteúdo programado para hoje (${item.company_name})`,
        message: `${item.title} · data ${formatDateBr(item.scheduled_date)} · status ${item.status}`,
        linkUrl: `/prompt-creator?contentId=${item.id}`,
      });
    }

    for (const b of briefingsRes.rows) {
      notifications.push({
        dedupKey: `briefing-completed:${b.id}`,
        type: "BRIEFING_COMPLETED",
        severity: "success",
        category: "BRIEFING",
        entityType: "briefing_session",
        entityId: b.id,
        title: `Briefing preenchido: ${b.company_name}`,
        message: "O cliente concluiu o briefing interativo e os dados já estão disponíveis no projeto",
        linkUrl: `/projects/${b.project_id}`,
      });
    }

    await Promise.all(
      notifications.map(async (item) => {
        await NotificationService.createSafeNotification(item);
        generatedCount += 1;
      })
    );

    return { synced: true, generatedCount };
  } catch (err) {
    console.warn("[syncOperationalAlerts] Aviso durante sincronização de alertas:", err);
    return { synced: false, generatedCount };
  }
}
