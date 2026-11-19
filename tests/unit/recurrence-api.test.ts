import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({admin:vi.fn(),projects:vi.fn(),contracts:vi.fn(),payables:vi.fn()}));
vi.mock("@/lib/auth/require-auth",()=>({requireAdminUser:mocks.admin}));
vi.mock("@/modules/projects/service",()=>({processAllRecurringProjects:mocks.projects}));
vi.mock("@/modules/financial/service",()=>({processContractRecurrence:mocks.contracts,processPayableRecurrence:mocks.payables}));
import {GET as projectGet,POST as projectPost} from "@/app/api/projects/recurrence/process/route";
import {GET as financialGet,POST as financialPost} from "@/app/api/financial/recurrence/process/route";
beforeEach(()=>{vi.stubEnv("CRON_SECRET","cron-test");mocks.admin.mockResolvedValue({id:"admin"});mocks.projects.mockResolvedValue({createdCount:1,errors:[]});mocks.contracts.mockResolvedValue({createdCount:1});mocks.payables.mockResolvedValue({createdCount:0});});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe("Scheduled recurrence",()=>{
 it.each([projectGet,financialGet])("rejects GET without the cron secret even with a browser session",async handler=>{
  expect((await handler(new Request("https://erp.test/process"))).status).toBe(401);
 });
 it.each([projectGet,financialGet])("supports an authorized scheduler GET",async handler=>{
  const response=await handler(new Request("https://erp.test/process?competency=2026-11",{headers:{authorization:"Bearer cron-test"}}));
  expect(response.status).toBe(200);expect((await response.json()).success).toBe(true);
 });
 it.each([projectPost,financialPost])("rejects malformed months before processing",async handler=>{
  expect((await handler(new Request("https://erp.test/process?competency=2026-99",{method:"POST"}))).status).toBe(400);
  expect(mocks.projects).not.toHaveBeenCalled();expect(mocks.contracts).not.toHaveBeenCalled();
 });
 it("reports partial project failures as failures",async()=>{
  mocks.projects.mockResolvedValue({createdCount:1,errors:[{contractNumber:"CTR-1",error:"unavailable"}]});
  const response=await projectPost(new Request("https://erp.test/process",{method:"POST"}));
  expect(response.status).toBe(500);expect((await response.json()).success).toBe(false);
 });
});
