import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const isClientSpecific = Boolean(clientId && clientId !== "otimizza");

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // ==========================================
    // 1. AQUISIÇÃO (Leads e Prospecção)
    // ==========================================
    let leadsThisMonthSql = `
      SELECT COUNT(*) as count 
      FROM crm_leads 
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `;
    let totalLeadsSql = `SELECT COUNT(*) as count FROM crm_leads WHERE status != 'ARCHIVED'`;
    let sourcesSql = `
      SELECT COALESCE(source, 'Outros') as source, COUNT(*) as count 
      FROM crm_leads 
      GROUP BY source 
      ORDER BY count DESC 
      LIMIT 3
    `;
    const leadParams: unknown[] = [];

    if (isClientSpecific) {
      leadsThisMonthSql = `
        SELECT COUNT(*) as count 
        FROM crm_leads 
        WHERE converted_client_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)
      `;
      totalLeadsSql = `SELECT COUNT(*) as count FROM crm_leads WHERE converted_client_id = $1`;
      sourcesSql = `
        SELECT COALESCE(source, 'Outros') as source, COUNT(*) as count 
        FROM crm_leads 
        WHERE converted_client_id = $1 
        GROUP BY source 
        ORDER BY count DESC 
        LIMIT 3
      `;
      leadParams.push(clientId);
    }

    const [leadsMonthRes, totalLeadsRes, sourcesRes] = await Promise.all([
      query<{ count: string }>(leadsThisMonthSql, leadParams),
      query<{ count: string }>(totalLeadsSql, leadParams),
      query<{ source: string; count: string }>(sourcesSql, leadParams),
    ]);

    // ==========================================
    // 2. NUTRIÇÃO (Oportunidades em Aberto & Pipeline)
    // ==========================================
    let openOppsSql = `
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0) as total_amount 
      FROM crm_opportunities 
      WHERE status = 'OPEN'
    `;
    let activitiesSql = `
      SELECT COUNT(*) as count 
      FROM crm_activities 
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `;
    const oppParams: unknown[] = [];

    if (isClientSpecific) {
      openOppsSql = `
        SELECT 
          COUNT(*) as count, 
          COALESCE(SUM(amount), 0) as total_amount 
        FROM crm_opportunities 
        WHERE client_id = $1 AND status = 'OPEN'
      `;
      activitiesSql = `
        SELECT COUNT(*) as count 
        FROM crm_activities a
        JOIN crm_opportunities o ON o.id = a.opportunity_id
        WHERE o.client_id = $1 AND a.created_at >= date_trunc('month', CURRENT_DATE)
      `;
      oppParams.push(clientId);
    }

    const [openOppsRes, activitiesRes] = await Promise.all([
      query<{ count: string; total_amount: string }>(openOppsSql, oppParams),
      query<{ count: string }>(activitiesSql, oppParams),
    ]);

    // ==========================================
    // 3. CONVERSÃO (Oportunidades Ganhas vs Perdidas)
    // ==========================================
    let wonSql = `
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0) as total_amount 
      FROM crm_opportunities 
      WHERE status = 'WON' AND updated_at >= date_trunc('month', CURRENT_DATE)
    `;
    let lostSql = `
      SELECT COUNT(*) as count 
      FROM crm_opportunities 
      WHERE status = 'LOST' AND updated_at >= date_trunc('month', CURRENT_DATE)
    `;
    let totalWonAllTimeSql = `
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0) as total_amount 
      FROM crm_opportunities 
      WHERE status = 'WON'
    `;
    let totalLostAllTimeSql = `
      SELECT COUNT(*) as count 
      FROM crm_opportunities 
      WHERE status = 'LOST'
    `;

    if (isClientSpecific) {
      wonSql = `
        SELECT 
          COUNT(*) as count, 
          COALESCE(SUM(amount), 0) as total_amount 
        FROM crm_opportunities 
        WHERE client_id = $1 AND status = 'WON' AND updated_at >= date_trunc('month', CURRENT_DATE)
      `;
      lostSql = `
        SELECT COUNT(*) as count 
        FROM crm_opportunities 
        WHERE client_id = $1 AND status = 'LOST' AND updated_at >= date_trunc('month', CURRENT_DATE)
      `;
      totalWonAllTimeSql = `
        SELECT 
          COUNT(*) as count, 
          COALESCE(SUM(amount), 0) as total_amount 
        FROM crm_opportunities 
        WHERE client_id = $1 AND status = 'WON'
      `;
      totalLostAllTimeSql = `
        SELECT COUNT(*) as count 
        FROM crm_opportunities 
        WHERE client_id = $1 AND status = 'LOST'
      `;
    }

    const [wonRes, lostRes, totalWonRes, totalLostRes] = await Promise.all([
      query<{ count: string; total_amount: string }>(wonSql, oppParams),
      query<{ count: string }>(lostSql, oppParams),
      query<{ count: string; total_amount: string }>(totalWonAllTimeSql, oppParams),
      query<{ count: string }>(totalLostAllTimeSql, oppParams),
    ]);

    const wonMonthCount = parseInt(wonRes.rows[0]?.count || "0", 10);
    const wonMonthAmount = parseFloat(wonRes.rows[0]?.total_amount || "0");
    const lostMonthCount = parseInt(lostRes.rows[0]?.count || "0", 10);

    const totalWonCount = parseInt(totalWonRes.rows[0]?.count || "0", 10);
    const totalWonAmount = parseFloat(totalWonRes.rows[0]?.total_amount || "0");
    const totalLostCount = parseInt(totalLostRes.rows[0]?.count || "0", 10);

    const closedMonthTotal = wonMonthCount + lostMonthCount;
    const realConversionRateMonth = closedMonthTotal > 0
      ? (wonMonthCount / closedMonthTotal) * 100
      : totalWonCount + totalLostCount > 0
      ? (totalWonCount / (totalWonCount + totalLostCount)) * 100
      : 0;

    const avgTicket = totalWonCount > 0 ? totalWonAmount / totalWonCount : 0;

    // ==========================================
    // 4. RETENÇÃO / PÓS-VENDA (Contratos Vigentes & MRR)
    // ==========================================
    let contractsSql = `SELECT COUNT(*) as count FROM contracts WHERE status = 'ACTIVE'`;
    let canceledSql = `
      SELECT COUNT(*) as count 
      FROM contracts 
      WHERE status = 'CANCELED' AND updated_at >= date_trunc('month', CURRENT_DATE)
    `;
    let mrrSql = `
      WITH active_versions AS (
        SELECT DISTINCT ON (c.id) 
          c.id as contract_id,
          CASE WHEN cv.billing_period='MIXED' THEN 'MONTHLY' ELSE cv.billing_period END AS billing_period,
          CASE WHEN cv.billing_period='MIXED' 
            THEN (SELECT COALESCE(SUM(CASE WHEN ci.periodicity='MONTHLY' THEN ci.total_price WHEN ci.periodicity='YEARLY' THEN ci.total_price/12 ELSE 0 END),0) 
                  FROM contract_items ci WHERE ci.contract_version_id=cv.id) 
            ELSE cv.total_amount 
          END AS total_amount
        FROM contracts c
        JOIN contract_versions cv ON cv.contract_id = c.id
        WHERE c.status = 'ACTIVE'
          AND cv.effective_date <= $1
        ORDER BY c.id, cv.version_number DESC
      )
      SELECT billing_period, total_amount FROM active_versions
    `;
    const contractParams: unknown[] = [todayStr];

    if (isClientSpecific) {
      contractsSql = `SELECT COUNT(*) as count FROM contracts WHERE client_id = $1 AND status = 'ACTIVE'`;
      canceledSql = `
        SELECT COUNT(*) as count 
        FROM contracts 
        WHERE client_id = $1 AND status = 'CANCELED' AND updated_at >= date_trunc('month', CURRENT_DATE)
      `;
      mrrSql = `
        WITH active_versions AS (
          SELECT DISTINCT ON (c.id) 
            c.id as contract_id,
            CASE WHEN cv.billing_period='MIXED' THEN 'MONTHLY' ELSE cv.billing_period END AS billing_period,
            CASE WHEN cv.billing_period='MIXED' 
              THEN (SELECT COALESCE(SUM(CASE WHEN ci.periodicity='MONTHLY' THEN ci.total_price WHEN ci.periodicity='YEARLY' THEN ci.total_price/12 ELSE 0 END),0) 
                    FROM contract_items ci WHERE ci.contract_version_id=cv.id) 
              ELSE cv.total_amount 
            END AS total_amount
          FROM contracts c
          JOIN contract_versions cv ON cv.contract_id = c.id
          WHERE c.client_id = $2 AND c.status = 'ACTIVE'
            AND cv.effective_date <= $1
          ORDER BY c.id, cv.version_number DESC
        )
        SELECT billing_period, total_amount FROM active_versions
      `;
      contractParams.push(clientId);
    }

    const [activeContractsRes, canceledContractsRes, mrrRowsRes] = await Promise.all([
      query<{ count: string }>(contractsSql, isClientSpecific ? [clientId] : []),
      query<{ count: string }>(canceledSql, isClientSpecific ? [clientId] : []),
      query<{ billing_period: string; total_amount: string }>(mrrSql, contractParams),
    ]);

    let currentMrr = 0;
    for (const row of mrrRowsRes.rows) {
      const amt = Number(row.total_amount);
      if (row.billing_period === "MONTHLY") {
        currentMrr += amt;
      } else if (row.billing_period === "YEARLY") {
        currentMrr += amt / 12;
      }
    }

    const activeContractsCount = parseInt(activeContractsRes.rows[0]?.count || "0", 10);
    const canceledContractsCount = parseInt(canceledContractsRes.rows[0]?.count || "0", 10);
    const retentionRate = (activeContractsCount + canceledContractsCount) > 0
      ? (activeContractsCount / (activeContractsCount + canceledContractsCount)) * 100
      : 100;

    return NextResponse.json({
      success: true,
      clientId: clientId || "otimizza",
      isClientSpecific,
      metrics: {
        acquisition: {
          realLeadsMonth: parseInt(leadsMonthRes.rows[0]?.count || "0", 10),
          totalActiveLeads: parseInt(totalLeadsRes.rows[0]?.count || "0", 10),
          topSources: sourcesRes.rows.map((r) => ({ source: r.source, count: parseInt(r.count, 10) })),
        },
        nutrition: {
          openOpportunities: parseInt(openOppsRes.rows[0]?.count || "0", 10),
          pipelineAmount: parseFloat(openOppsRes.rows[0]?.total_amount || "0"),
          monthlyActivities: parseInt(activitiesRes.rows[0]?.count || "0", 10),
        },
        conversion: {
          wonMonthCount,
          wonMonthAmount,
          lostMonthCount,
          totalWonCount,
          realConversionRate: Number(realConversionRateMonth.toFixed(1)),
          avgTicket: Number(avgTicket.toFixed(2)),
        },
        retention: {
          activeContracts: activeContractsCount,
          realMrr: Number(currentMrr.toFixed(2)),
          canceledContractsMonth: canceledContractsCount,
          retentionRate: Number(retentionRate.toFixed(1)),
        },
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao calcular métricas reais do ERP para os funis:", error);
    return NextResponse.json(
      { error: "Erro ao calcular métricas reais do ERP", details: String(error) },
      { status: 500 }
    );
  }
}
