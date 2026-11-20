import {describe,it,expect,vi,beforeEach} from "vitest";
const {query,auth}=vi.hoisted(()=>({query:vi.fn(),auth:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query,withTransaction:(callback:(db:unknown)=>unknown)=>callback({query})}));vi.mock("@/lib/auth/require-auth",()=>({requireAdminUser:auth}));
import {GET,PUT} from "@/app/api/clients/[id]/identity/route";
const id="11111111-1111-4111-8111-111111111111",scope={params:Promise.resolve({id})};
beforeEach(()=>{vi.resetAllMocks();auth.mockResolvedValue({id:"admin"});});
describe("Identity consistency",()=>{
 it("uses the canonical audiences instead of stale legacy values",async()=>{
  query.mockResolvedValueOnce({rows:[{client_id:id,target_audiences:["Público antigo"]}]}).mockResolvedValueOnce({rows:[{name:"Público atual"}]});
  expect(await (await GET(new Request("http://localhost"),scope)).json()).toMatchObject({targetAudiences:["Público atual"]});
 });
 it("does not overwrite unrelated fields when editing only notes",async()=>{
  query.mockResolvedValue({rows:[{id}]});const request=new Request("http://localhost",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({notes:"Nova orientação"})});
  expect((await PUT(request,scope)).status).toBe(200);const [sql,values]=query.mock.calls[0];expect(sql).toContain("CASE WHEN $19::jsonb ? 'brandContext' THEN");expect(sql).toContain("ELSE client_identities.brand_context");expect(values[18]).toBe('["notes"]');
 });
});
