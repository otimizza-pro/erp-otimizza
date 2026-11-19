import {describe,it,expect,vi,beforeEach} from "vitest";
const {sql}=vi.hoisted(()=>({sql:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({getDbPool:()=>({query:sql}),query:sql,withTransaction:vi.fn(),afterCommit:vi.fn()}));
import {CrmService} from "@/modules/crm/service";
const clientId="11111111-1111-4111-8111-111111111111";
beforeEach(()=>{sql.mockReset();sql.mockImplementation((text:string)=>Promise.resolve({rows:/COUNT\(\*\)/i.test(text)?[{count:0}]:[]}));});
describe("CRM company filters",()=>{
 it("binds opportunity client IDs instead of comparing UUIDs to integers",async()=>{await CrmService.listOpportunities({clientId});const calls=sql.mock.calls.filter(([q])=>q.includes("o.client_id"));expect(calls.length).toBeGreaterThan(0);for(const [text,values]of calls){expect(text).toContain("o.client_id = $1");expect(values[0]).toBe(clientId);}});
 it("binds activity company filters and excludes archived records",async()=>{await CrmService.listActivities({clientId});const [text,values]=sql.mock.calls[0];expect(text).toContain("a.client_id = $1");expect(text).toContain("a.archived_at IS NULL");expect(values[0]).toBe(clientId);});
});
