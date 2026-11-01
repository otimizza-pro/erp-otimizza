import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    // Execução otimizada em 6 queries paralelas (redução de 50% nas viagens ao pool serverless)
    // Cada query calcula a contagem total com COUNT(*) OVER() de forma atômica
    const [
      activitiesRes,
      proposalsRes,
      overdueRecRes,
      upcomingPayRes,
      expiringContractsRes,
      overdueProjectsRes,
    ] = await Promise.all([
      // 1. Atividades comerciais atrasadas ou previstas para hoje
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
        `SELECT a.id, a.title, a.due_date, a.activity_type,
                l.name as lead_name, cl.name as client_name,
                (a.due_date < CURRENT_TIMESTAMP) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM crm_activities a
         LEFT JOIN crm_leads l ON l.id = a.lead_id
         LEFT JOIN clients cl ON cl.id = a.client_id
         WHERE a.status = 'PENDING'
           AND a.due_date <= (CURRENT_DATE + INTERVAL '1 day')
         ORDER BY a.due_date ASC
         LIMIT 6`
      ),

      // 2. Propostas comerciais aguardando retorno do cliente
      query<{
        id: string;
        proposal_code: string;
        title: string;
        recipient_name: string;
        total_amount: number;
        valid_until: string;
        days_sent: number;
        total_count: number;
      }>(
        `SELECT p.id, p.proposal_code, p.title,
                COALESCE(cl.name, l.name, pv.recipient_snapshot->>'name', 'Cliente/Lead') as recipient_name,
                COALESCE(pv.subtotal_one_time + pv.subtotal_monthly, 0)::numeric as total_amount,
                p.valid_until,
                EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.updated_at))::int as days_sent,
                COUNT(*) OVER()::int as total_count
         FROM proposals p
         LEFT JOIN clients cl ON cl.id = p.client_id
         LEFT JOIN crm_leads l ON l.id = p.lead_id
         LEFT JOIN proposal_versions pv ON pv.proposal_id = p.id AND pv.version_number = p.current_version_number
         WHERE p.status = 'SENT'
         ORDER BY p.updated_at ASC
         LIMIT 6`
      ),

      // 3. Contas a receber vencidas (inadimplência)
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
        `SELECT r.id, r.receivable_number, r.description, cl.name as client_name,
                r.balance_amount, r.due_date,
                (CURRENT_DATE - r.due_date)::int as days_overdue,
                COUNT(*) OVER()::int as total_count
         FROM receivables r
         JOIN clients cl ON cl.id = r.client_id
         WHERE r.status = 'PENDING' AND r.due_date < CURRENT_DATE
         ORDER BY r.due_date ASC
         LIMIT 6`
      ),

      // 4. Contas a pagar próximas do vencimento (próximos 7 dias ou atrasadas)
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
        `SELECT p.id, p.payable_number, p.description, p.supplier_name,
                p.balance_amount, p.due_date,
                (p.due_date < CURRENT_DATE) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM payables p
         WHERE p.status = 'PENDING'
           AND p.due_date <= (CURRENT_DATE + INTERVAL '7 days')
         ORDER BY p.due_date ASC
         LIMIT 6`
      ),

      // 5. Contratos com vigência próxima do término (nos próximos 30 dias)
      query<{
        id: string;
        contract_number: string;
        client_name: string;
        end_date: string;
        days_remaining: number;
        total_count: number;
      }>(
        `SELECT c.id, c.contract_number, cl.name as client_name,
                cv.end_date, (cv.end_date - CURRENT_DATE)::int as days_remaining,
                COUNT(*) OVER()::int as total_count
         FROM contracts c
         JOIN clients cl ON cl.id = c.client_id
         JOIN contract_versions cv ON cv.contract_id = c.id
         WHERE c.status = 'ACTIVE'
           AND cv.is_indefinite = false
           AND cv.end_date IS NOT NULL
           AND cv.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
         ORDER BY cv.end_date ASC
         LIMIT 6`
      ),

      // 6. Projetos com prazo próximo ou atrasados
      query<{
        id: string;
        project_code: string;
        name: string;
        status: string;
        due_date: string;
        is_overdue: boolean;
        total_count: number;
      }>(
        `SELECT p.id, p.project_number as project_code, p.name, p.status, p.due_date,
                (p.due_date < CURRENT_DATE) as is_overdue,
                COUNT(*) OVER()::int as total_count
         FROM projects p
         WHERE p.status NOT IN ('COMPLETED', 'CANCELED')
           AND p.due_date IS NOT NULL
           AND p.due_date <= (CURRENT_DATE + INTERVAL '7 days')
         ORDER BY p.due_date ASC
         LIMIT 6`
      ),
    ]);

    // Limpar o campo interno total_count das linhas retornadas
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
        },
        counts: {
          activities: activitiesRes.rows[0]?.total_count ?? 0,
          proposals: proposalsRes.rows[0]?.total_count ?? 0,
          overdueReceivables: overdueRecRes.rows[0]?.total_count ?? 0,
          upcomingPayables: upcomingPayRes.rows[0]?.total_count ?? 0,
          expiringContracts: expiringContractsRes.rows[0]?.total_count ?? 0,
          overdueProjects: overdueProjectsRes.rows[0]?.total_count ?? 0,
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
