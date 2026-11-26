import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function GET() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const today = todaySaoPaulo();

    const [
      activitiesRes,
      proposalsRes,
      overdueRecRes,
      upcomingPayRes,
      expiringContractsRes,
      overdueProjectsRes,
      overdueTasksRes,
      contentDueRes,
      briefingsRes,
    ] = await Promise.all([
      // 1. Atividades comerciais atrasadas ou previstas para hoje (inclui RESCHEDULED e exclui arquivadas)
      query<{
        id: string;
        title: string;
        due_date: string;
        activity_type: string;
        lead_name: string | null;
        client_name: string | null;
        is_overdue: boolean;
        total_count: number;
      }>(
        `SELECT a.id, a.title, a.due_date::text, a.activity_type,
                l.name as lead_name, COALESCE(NULLIF(cl.trade_name, ''), cl.name) as client_name,
                ((a.due_date AT TIME ZONE 'America/Sao_Paulo')::date < $1::date) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM crm_activities a
         LEFT JOIN crm_leads l ON l.id = a.lead_id
         LEFT JOIN clients cl ON cl.id = a.client_id
         WHERE a.archived_at IS NULL
           AND a.status IN ('PENDING', 'RESCHEDULED')
           AND a.due_date IS NOT NULL
           AND (a.due_date AT TIME ZONE 'America/Sao_Paulo')::date <= $1::date
         ORDER BY a.due_date ASC
         LIMIT 6`,
        [today]
      ),

      // 2. Propostas comerciais enviadas / em negociação ou expiradas sem fechamento
      query<{
        id: string;
        proposal_code: string;
        title: string;
        recipient_name: string;
        total_amount: number;
        valid_until: string | null;
        days_sent: number;
        total_count: number;
      }>(
        `SELECT p.id, p.proposal_code, p.title,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name, l.name, pv.recipient_snapshot->>'name', 'Cliente/Lead') as recipient_name,
                COALESCE(pv.subtotal_one_time + pv.subtotal_monthly, 0)::numeric as total_amount,
                p.valid_until::text,
                EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.updated_at))::int as days_sent,
                COUNT(*) OVER()::int as total_count
         FROM proposals p
         LEFT JOIN clients cl ON cl.id = p.client_id
         LEFT JOIN crm_leads l ON l.id = p.lead_id
         LEFT JOIN proposal_versions pv ON pv.proposal_id = p.id AND pv.version_number = p.current_version_number
         WHERE p.archived_at IS NULL
           AND p.status IN ('SENT', 'NEGOTIATING')
         ORDER BY p.valid_until ASC NULLS LAST, p.updated_at ASC
         LIMIT 6`
      ),

      // 3. Contas a receber vencidas (PENDING vencidas, OVERDUE e PARTIALLY_PAID vencidas)
      query<{
        id: string;
        receivable_number: string;
        description: string;
        client_name: string;
        balance_amount: number;
        due_date: string;
        days_overdue: number;
        total_count: number;
      }>(
        `SELECT r.id, r.receivable_number, r.description,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name) as client_name,
                r.balance_amount::numeric as balance_amount, r.due_date::text,
                ($1::date - r.due_date)::int as days_overdue,
                COUNT(*) OVER()::int as total_count
         FROM receivables r
         JOIN clients cl ON cl.id = r.client_id
         WHERE r.status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID')
           AND r.due_date < $1::date
         ORDER BY r.due_date ASC
         LIMIT 6`,
        [today]
      ),

      // 4. Contas a pagar vencidas ou próximas do vencimento (próximos 7 dias)
      query<{
        id: string;
        payable_number: string;
        description: string;
        supplier_name: string;
        balance_amount: number;
        due_date: string;
        is_overdue: boolean;
        total_count: number;
      }>(
        `SELECT p.id, p.payable_number, p.description, COALESCE(p.supplier_name, p.description) as supplier_name,
                p.balance_amount::numeric as balance_amount, p.due_date::text,
                (p.due_date < $1::date) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM payables p
         WHERE p.status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID')
           AND p.due_date <= ($1::date + INTERVAL '7 days')::date
         ORDER BY p.due_date ASC
         LIMIT 6`,
        [today]
      ),

      // 5. Contratos ativos com versão atual próxima do término (30 dias)
      query<{
        id: string;
        contract_number: string;
        client_name: string;
        end_date: string;
        days_remaining: number;
        total_count: number;
      }>(
        `SELECT c.id, c.contract_number,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name) as client_name,
                cv.end_date::text, (cv.end_date - $1::date)::int as days_remaining,
                COUNT(*) OVER()::int as total_count
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
         LIMIT 6`,
        [today]
      ),

      // 6. Projetos ativos com prazo próximo ou atrasados
      query<{
        id: string;
        project_code: string;
        name: string;
        status: string;
        due_date: string;
        is_overdue: boolean;
        total_count: number;
      }>(
        `SELECT p.id, p.project_number as project_code, p.name, p.status, p.due_date::text,
                (p.due_date < $1::date) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM projects p
         WHERE p.archived_at IS NULL
           AND p.status NOT IN ('COMPLETED', 'CANCELED')
           AND p.due_date IS NOT NULL
           AND p.due_date <= ($1::date + INTERVAL '7 days')::date
         ORDER BY p.due_date ASC
         LIMIT 6`,
        [today]
      ),

      // 7. Tarefas de projetos atrasadas ou para os próximos 7 dias
      query<{
        id: string;
        project_id: string;
        title: string;
        project_name: string;
        due_date: string;
        is_overdue: boolean;
        total_count: number;
      }>(
        `SELECT t.id, t.project_id, t.title, p.name as project_name, t.due_date::text,
                (t.due_date < $1::date) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM project_tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE p.archived_at IS NULL
           AND p.status NOT IN ('COMPLETED', 'CANCELED')
           AND t.status NOT IN ('DONE', 'CANCELED')
           AND t.due_date IS NOT NULL
           AND t.due_date <= ($1::date + INTERVAL '7 days')::date
         ORDER BY t.due_date ASC
         LIMIT 6`,
        [today]
      ),

      // 8. Conteúdos previstos para hoje ou em atraso
      query<{
        id: string;
        title: string;
        scheduled_date: string;
        status: string;
        company_name: string;
        is_overdue: boolean;
        total_count: number;
      }>(
        `SELECT c.id, c.title, c.scheduled_date::text, c.status,
                COALESCE(NULLIF(cl.trade_name, ''), cl.name) as company_name,
                (c.scheduled_date < $1::date) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM content_calendar_items c
         JOIN clients cl ON cl.id = c.client_id
         WHERE c.archived_at IS NULL
           AND c.status NOT IN ('PUBLISHED')
           AND c.scheduled_date IS NOT NULL
           AND c.scheduled_date <= $1::date
         ORDER BY c.scheduled_date ASC
         LIMIT 6`,
        [today]
      ),

      // 9. Briefings preenchidos por clientes nos últimos 14 dias
      query<{
        id: string;
        project_id: string;
        company_name: string;
        completed_at: string;
        total_count: number;
      }>(
        `SELECT bs.id, bs.project_id, bs.company_name, bs.completed_at::text,
                COUNT(*) OVER()::int as total_count
         FROM client_briefing_sessions bs
         JOIN projects p ON p.id = bs.project_id
         WHERE p.archived_at IS NULL
           AND bs.status = 'COMPLETED'
           AND bs.completed_at >= NOW() - INTERVAL '14 days'
         ORDER BY bs.completed_at DESC
         LIMIT 6`
      ),
    ]);

    const sanitizeRows = <T extends { total_count?: number }>(rows: T[]) =>
      rows.map(({ total_count: _, ...rest }) => rest);

    return NextResponse.json(
      {
        success: true,
        actionItems: {
          activities: sanitizeRows(activitiesRes.rows),
          proposals: sanitizeRows(proposalsRes.rows),
          overdueReceivables: sanitizeRows(overdueRecRes.rows),
          upcomingPayables: sanitizeRows(upcomingPayRes.rows),
          expiringContracts: sanitizeRows(expiringContractsRes.rows),
          overdueProjects: sanitizeRows(overdueProjectsRes.rows),
          overdueTasks: sanitizeRows(overdueTasksRes.rows),
          contentDue: sanitizeRows(contentDueRes.rows),
          completedBriefings: sanitizeRows(briefingsRes.rows),
        },
        counts: {
          activities: activitiesRes.rows[0]?.total_count ?? 0,
          proposals: proposalsRes.rows[0]?.total_count ?? 0,
          overdueReceivables: overdueRecRes.rows[0]?.total_count ?? 0,
          upcomingPayables: upcomingPayRes.rows[0]?.total_count ?? 0,
          expiringContracts: expiringContractsRes.rows[0]?.total_count ?? 0,
          overdueProjects: overdueProjectsRes.rows[0]?.total_count ?? 0,
          overdueTasks: overdueTasksRes.rows[0]?.total_count ?? 0,
          contentDue: contentDueRes.rows[0]?.total_count ?? 0,
          completedBriefings: briefingsRes.rows[0]?.total_count ?? 0,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Erro ao carregar itens de ação do dashboard:", error);
    const msg = error instanceof Error ? error.message : "Erro ao carregar pendências do sistema.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
