import { getServiceProfitabilityReport, getComboProfitabilityReport, getClientProfitabilityReport, getExecutiveKpis } from "../src/modules/analytics/service";

async function main() {
  const s = await getServiceProfitabilityReport();
  console.log("Services profitability rows:", s.length);

  const c = await getComboProfitabilityReport();
  console.log("Combos profitability rows:", c.length);

  const cl = await getClientProfitabilityReport();
  console.log("Clients profitability rows:", cl.length);

  const kpis = await getExecutiveKpis();
  console.log("Executive KPIs loaded:", !!kpis);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
