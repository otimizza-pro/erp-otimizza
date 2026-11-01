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
      }>(
        `SELECT a.id, a.title, a.due_date, a.activity_type,
                l.name as lead_name, cl.name as client_name,
                (a.due_date < CURRENT_TIMESTAMP) as is_overdue
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
      }>(
        `SELECT p.id, p.proposal_code, p.title, p.recipient_name, p.total_amount, p.valid_until,
                EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.updated_at))::int as days_sent
         FROM proposals p
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
      }>(
        `SELECT r.id, r.receivable_number, r.description, cl.name as client_name,
                r.balance_amount, r.due_date,
                (CURRENT_DATE - r.due_date)::int as days_overdue
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
      }>(
        `SELECT p.id, p.payable_number, p.description, p.supplier_name,
                p.balance_amount, p.due_date,
                (p.due_date < CURRENT_DATE) as is_overdue
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
      }>(
        `SELECT c.id, c.contract_number, cl.name as client_name,
                cv.end_date, (cv.end_date - CURRENT_DATE)::int as days_remaining
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
      }>(
        `SELECT p.id, p.project_code, p.name, p.status, p.due_date,
                (p.due_date < CURRENT_DATE) as is_overdue
         FROM projects p
         WHERE p.status NOT IN ('COMPLETED', 'CANCELED')
           AND p.due_date IS NOT NULL
           AND p.due_date <= (CURRENT_DATE + INTERVAL '7 days')
         ORDER BY p.due_date ASC
         LIMIT 6`
      ),
    ]);

    return NextResponse.json({
      success: true,
      actionItems: {
        activities: activitiesRes.rows,
        proposals: proposalsRes.rows,
        overdueReceivables: overdueRecRes.rows,
        upcomingPayables: upcomingPayRes.rows,
        expiringContracts: expiringContractsRes.rows,
        overdueProjects: overdueProjectsRes.rows,
      },
      counts: {
        activities: activitiesRes.rowCount,
        proposals: proposalsRes.rowCount,
        overdueReceivables: overdueRecRes.rowCount,
        upcomingPayables: upcomingPayRes.rowCount,
        expiringContracts: expiringContractsRes.rowCount,
        overdueProjects: overdueProjectsRes.rowCount,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao carregar itens de ação do dashboard:", error);
    const msg = error instanceof Error ? error.message : "Erro ao carregar pendências do sistema.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
