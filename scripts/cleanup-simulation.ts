import { query, withTransaction, KNOWN_PRODUCTION_PROJECT_REF, extractProjectRef } from "../src/lib/db/pool";
import { getEnv } from "../src/lib/env";

export const SIMULATION_BATCH_ID = "SIM-2026-OTIMIZZA-V1";
export const BATCH_TAG = `[LOTE:${SIMULATION_BATCH_ID}]`;

export async function cleanupSimulationData(): Promise<{ deletedCounts: Record<string, number> }> {
  const env = getEnv();
  const activeConn = process.env.NODE_ENV === "test" ? env.DATABASE_URL_TEST : env.DATABASE_URL;
  const projectRef = extractProjectRef(activeConn);

  if (projectRef === KNOWN_PRODUCTION_PROJECT_REF) {
    throw new Error("🚨 PERIGO: Tentativa de limpeza em PRODUÇÃO! Abortando imediatamente!");
  }

  console.log(`🧹 Iniciando limpeza segura do lote de simulação "${SIMULATION_BATCH_ID}"...`);
  const counts: Record<string, number> = {};

  await withTransaction(async (client) => {
    // 1. Statements vinculados a settlements ou com a tag
    const stmtsRes = await client.query(`
      DELETE FROM financial_statements 
      WHERE description LIKE '%${BATCH_TAG}%'
         OR settlement_id IN (
           SELECT id FROM financial_settlements WHERE notes LIKE '%${BATCH_TAG}%'
         )
    `);
    counts.financial_statements = stmtsRes.rowCount || 0;

    // 2. Financial Settlements
    const settRes = await client.query(`
      DELETE FROM financial_settlements 
      WHERE notes LIKE '%${BATCH_TAG}%'
         OR receivable_id IN (
           SELECT id FROM receivables WHERE receivable_number LIKE 'REC-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
         )
         OR payable_id IN (
           SELECT id FROM payables WHERE payable_number LIKE 'PAG-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
         )
    `);
    counts.financial_settlements = settRes.rowCount || 0;

    // 3. Allocations
    const allocRes = await client.query(`
      DELETE FROM financial_cost_center_allocations 
      WHERE payable_id IN (
        SELECT id FROM payables WHERE payable_number LIKE 'PAG-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
      )
    `);
    counts.cost_center_allocations = allocRes.rowCount || 0;

    // 4. Receivables
    const recRes = await client.query(`
      DELETE FROM receivables 
      WHERE receivable_number LIKE 'REC-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
    `);
    counts.receivables = recRes.rowCount || 0;

    // 5. Payables
    const payRes = await client.query(`
      DELETE FROM payables 
      WHERE payable_number LIKE 'PAG-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
    `);
    counts.payables = payRes.rowCount || 0;

    // 6. Project items
    await client.query(`
      DELETE FROM project_time_entries 
      WHERE project_id IN (
        SELECT id FROM projects WHERE project_number LIKE 'PRJ-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
      )
    `);
    await client.query(`
      DELETE FROM project_checklists 
      WHERE task_id IN (
        SELECT pt.id FROM project_tasks pt
        JOIN projects p ON p.id = pt.project_id
        WHERE p.project_number LIKE 'PRJ-SIM-%' OR p.notes LIKE '%${BATCH_TAG}%'
      )
    `);
    await client.query(`
      DELETE FROM project_tasks 
      WHERE project_id IN (
        SELECT id FROM projects WHERE project_number LIKE 'PRJ-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
      )
    `);
    await client.query(`
      DELETE FROM project_stages 
      WHERE project_id IN (
        SELECT id FROM projects WHERE project_number LIKE 'PRJ-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
      )
    `);
    const prjRes = await client.query(`
      DELETE FROM projects 
      WHERE project_number LIKE 'PRJ-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
    `);
    counts.projects = prjRes.rowCount || 0;

    // 7. Proposal contract conversions (references contracts and proposals)
    await client.query(`
      DELETE FROM proposal_contract_conversions 
      WHERE contract_id IN (
        SELECT id FROM contracts WHERE contract_number LIKE 'CTR-SIM-%'
      ) OR proposal_id IN (
        SELECT id FROM proposals WHERE proposal_code LIKE 'PROP-SIM-%'
      )
    `);

    // 8. Contract recurrence settings
    await client.query(`
      DELETE FROM contract_project_recurring_settings 
      WHERE contract_id IN (
        SELECT id FROM contracts WHERE contract_number LIKE 'CTR-SIM-%'
      )
    `);

    // 9. Contract items & versions & contracts
    await client.query(`
      DELETE FROM contract_items 
      WHERE contract_version_id IN (
        SELECT cv.id FROM contract_versions cv
        JOIN contracts c ON c.id = cv.contract_id
        WHERE c.contract_number LIKE 'CTR-SIM-%'
      )
    `);
    await client.query(`
      DELETE FROM contract_versions 
      WHERE contract_id IN (
        SELECT id FROM contracts WHERE contract_number LIKE 'CTR-SIM-%'
      )
    `);
    const ctrRes = await client.query(`
      DELETE FROM contracts 
      WHERE contract_number LIKE 'CTR-SIM-%'
    `);
    counts.contracts = ctrRes.rowCount || 0;

    // 10. Proposals
    await client.query(`
      DELETE FROM proposal_events 
      WHERE proposal_id IN (
        SELECT id FROM proposals WHERE proposal_code LIKE 'PROP-SIM-%'
      )
    `);
    await client.query(`
      DELETE FROM proposal_items 
      WHERE proposal_version_id IN (
        SELECT pv.id FROM proposal_versions pv
        JOIN proposals p ON p.id = pv.proposal_id
        WHERE p.proposal_code LIKE 'PROP-SIM-%'
      )
    `);
    await client.query(`
      DELETE FROM proposal_versions 
      WHERE proposal_id IN (
        SELECT id FROM proposals WHERE proposal_code LIKE 'PROP-SIM-%'
      )
    `);
    const propRes = await client.query(`
      DELETE FROM proposals 
      WHERE proposal_code LIKE 'PROP-SIM-%'
    `);
    counts.proposals = propRes.rowCount || 0;

    // 10. CRM
    await client.query(`
      DELETE FROM crm_activities 
      WHERE description LIKE '%${BATCH_TAG}%'
         OR opportunity_id IN (SELECT id FROM crm_opportunities WHERE opportunity_code LIKE 'OPP-SIM-%')
         OR lead_id IN (SELECT id FROM crm_leads WHERE lead_code LIKE 'LEAD-SIM-%')
    `);
    await client.query(`
      DELETE FROM crm_opportunity_history 
      WHERE opportunity_id IN (
        SELECT id FROM crm_opportunities WHERE opportunity_code LIKE 'OPP-SIM-%'
      )
    `);
    const oppRes = await client.query(`
      DELETE FROM crm_opportunities 
      WHERE opportunity_code LIKE 'OPP-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
    `);
    counts.crm_opportunities = oppRes.rowCount || 0;

    const leadRes = await client.query(`
      DELETE FROM crm_leads 
      WHERE lead_code LIKE 'LEAD-SIM-%' OR notes LIKE '%${BATCH_TAG}%'
    `);
    counts.crm_leads = leadRes.rowCount || 0;

    // 11. Clients
    await client.query(`
      DELETE FROM client_contacts 
      WHERE client_id IN (
        SELECT id FROM clients WHERE notes LIKE '%${BATCH_TAG}%'
      )
    `);
    const clientRes = await client.query(`
      DELETE FROM clients 
      WHERE notes LIKE '%${BATCH_TAG}%'
    `);
    counts.clients = clientRes.rowCount || 0;

    // 12. Accounts & Suppliers
    const accRes = await client.query(`
      DELETE FROM financial_accounts 
      WHERE name LIKE '%${BATCH_TAG}%'
    `);
    counts.financial_accounts = accRes.rowCount || 0;

    const supRes = await client.query(`
      DELETE FROM suppliers 
      WHERE trade_name LIKE '%${BATCH_TAG}%' OR name LIKE '%${BATCH_TAG}%' OR notes LIKE '%${BATCH_TAG}%'
    `);
    counts.suppliers = supRes.rowCount || 0;

    // 13. Services & Combos
    await client.query(`
      DELETE FROM combo_items 
      WHERE combo_id IN (SELECT id FROM combos WHERE description LIKE '%${BATCH_TAG}%')
    `);
    const cmbRes = await client.query(`
      DELETE FROM combos 
      WHERE description LIKE '%${BATCH_TAG}%'
    `);
    counts.combos = cmbRes.rowCount || 0;

    const svcRes = await client.query(`
      DELETE FROM services 
      WHERE description LIKE '%${BATCH_TAG}%'
    `);
    counts.services = svcRes.rowCount || 0;
  });

  console.log("✅ Limpeza do lote concluída com sucesso:", counts);
  return { deletedCounts: counts };
}

if (process.argv[1] && process.argv[1].includes("cleanup-simulation.ts")) {
  cleanupSimulationData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Erro ao limpar lote de simulação:", err);
      process.exit(1);
    });
}
