import { query } from "../src/lib/db/pool";

async function main() {
  const { rows: setts } = await query(
    `SELECT settlement_type, amount, settlement_date, notes FROM financial_settlements ORDER BY created_at DESC LIMIT 15`
  );
  console.log("Existing settlements:", setts);

  const { rows: recs } = await query(
    `SELECT competency, count(*), sum(original_amount) as orig, sum(paid_amount) as paid, sum(balance_amount) as bal 
     FROM receivables GROUP BY competency ORDER BY competency`
  );
  console.log("Existing receivables by competency:", recs);

  const { rows: pays } = await query(
    `SELECT competency, count(*), sum(original_amount) as orig, sum(paid_amount) as paid, sum(balance_amount) as bal 
     FROM payables GROUP BY competency ORDER BY competency`
  );
  console.log("Existing payables by competency:", pays);

  process.exit(0);
}

main().catch(console.error);

