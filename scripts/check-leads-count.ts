import { query } from "../src/lib/db/pool";

async function main() {
  const { rows: leads } = await query("SELECT count(*) FROM crm_leads WHERE lead_code LIKE 'LEAD-SIM-%'");
  console.log("Leads count:", leads[0].count);

  const { rows: opps } = await query("SELECT status, count(*) FROM crm_opportunities WHERE opportunity_code LIKE 'OPP-SIM-%' GROUP BY status");
  console.log("Opps by status:", opps);

  const { rows: props } = await query("SELECT count(*) FROM proposals WHERE proposal_code LIKE 'PROP-SIM-%'");
  console.log("Proposals count:", props[0].count);

  const { rows: ctrs } = await query("SELECT count(*) FROM contracts WHERE contract_number LIKE 'CTR-SIM-%'");
  console.log("Contracts count:", ctrs[0].count);

  const { rows: prjs } = await query("SELECT count(*) FROM projects WHERE project_number LIKE 'PRJ-SIM-%'");
  console.log("Projects count:", prjs[0].count);

  const { rows: recs } = await query("SELECT count(*) FROM receivables WHERE receivable_number LIKE 'REC-SIM-%'");
  console.log("Receivables count:", recs[0].count);

  process.exit(0);
}

main().catch(console.error);
