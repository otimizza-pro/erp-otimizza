import { CrmService } from "../src/modules/crm/service";

async function main() {
  const p = await CrmService.listPipelines();
  console.log("Pipelines count:", p.length);
  console.log(JSON.stringify(p, null, 2));
}

main().catch(console.error);

