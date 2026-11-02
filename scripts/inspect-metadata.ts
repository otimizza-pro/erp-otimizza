import { query } from "../src/lib/db/pool";

async function main() {
  console.log("=== USERS ===");
  const { rows: users } = await query("SELECT id, email, role, status FROM users");
  console.log(users);

  console.log("\n=== PIPELINES & STAGES ===");
  const { rows: pipes } = await query("SELECT id, name, is_default FROM crm_pipelines");
  console.log("Pipelines:", pipes);
  const { rows: stages } = await query("SELECT id, pipeline_id, name, stage_order, stage_type, win_probability FROM crm_pipeline_stages ORDER BY pipeline_id, stage_order");
  console.log("Stages:", stages);

  console.log("\n=== SERVICES & COMBOS ===");
  const { rows: services } = await query("SELECT id, name, service_type, base_price, default_cost, active FROM services");
  console.log("Services count:", services.length, services.slice(0, 5));
  const { rows: combos } = await query("SELECT id, name, price, active FROM combos");
  console.log("Combos count:", combos.length, combos);

  console.log("\n=== FINANCIAL ACCOUNTS & CATEGORIES ===");
  const { rows: accounts } = await query("SELECT id, name, account_type, bank_name, initial_balance, current_balance, active FROM financial_accounts");
  console.log("Accounts:", accounts.slice(0, 5));
  const { rows: cats } = await query("SELECT id, name, type, active FROM financial_categories");
  console.log("Categories:", cats);

  console.log("\n=== COST CENTERS ===");
  const { rows: ccs } = await query("SELECT id, code, name, active FROM cost_centers");
  console.log("Cost centers count:", ccs.length, ccs.slice(0, 5));

  console.log("\n=== SUPPLIERS ===");
  const { rows: sups } = await query("SELECT id, legal_name, trade_name, active FROM suppliers");
  console.log("Suppliers:", sups);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

