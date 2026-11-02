import { query } from "../src/lib/db/pool";

async function main() {
  const { rows } = await query("SELECT id, name, type, default_cost_center_id, managerial_account_id FROM financial_categories");
  console.log("Financial Categories:", rows);

  const { rows: mag } = await query("SELECT id, code, name, classification_group FROM managerial_accounts ORDER BY code");
  console.log("Managerial Accounts:", mag);

  process.exit(0);
}

main().catch(console.error);

