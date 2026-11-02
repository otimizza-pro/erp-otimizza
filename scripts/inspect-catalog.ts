import { query } from "../src/lib/db/pool";

async function main() {
  const { rows: svcs } = await query("SELECT id, name, default_price, default_cost, billing_unit, status FROM services");
  console.log("Services in DB:", svcs);

  const { rows: cmbs } = await query("SELECT id, name, total_price, status FROM combos");
  console.log("Combos in DB:", cmbs);

  const { rows: cats } = await query("SELECT id, name, type FROM financial_categories");
  console.log("Categories in DB:", cats);

  const { rows: ccs } = await query("SELECT id, code, name FROM cost_centers");
  console.log("Cost Centers in DB:", ccs);

  const { rows: pipes } = await query("SELECT id, name FROM crm_pipelines");
  console.log("Pipelines in DB:", pipes);

  const { rows: stages } = await query("SELECT id, pipeline_id, name, display_order, stage_type FROM crm_pipeline_stages ORDER BY pipeline_id, display_order");
  console.log("Stages in DB:", stages);

  process.exit(0);
}

main().catch(console.error);
