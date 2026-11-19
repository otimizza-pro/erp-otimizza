import {describe,it,expect,vi,beforeEach} from "vitest";
const {sql,auth}=vi.hoisted(()=>({sql:vi.fn(),auth:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:sql,withTransaction:async(fn:(client:{query:typeof sql})=>unknown)=>fn({query:sql})}));
vi.mock("@/lib/auth/require-auth",()=>({requireAdminUser:auth}));
import {POST} from "@/app/api/content-studio/configuration/route";
const clientId="00000000-0000-4000-8000-000000000001",id="11111111-1111-4111-8111-111111111111";
const request=(body:unknown)=>new Request("http://localhost/api/content-studio/configuration",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{sql.mockReset();auth.mockReset();auth.mockResolvedValue({id});});
describe("Content configuration writes",()=>{
 it("authenticates before accessing records",async()=>{auth.mockRejectedValue(new Error("unauthorized"));expect((await POST(request({}))).status).toBe(401);expect(sql).not.toHaveBeenCalled();});
 it("scopes permanent deletion to the selected company",async()=>{
  sql.mockResolvedValue({rows:[{id}]});
  expect((await POST(request({clientId,id,action:"THEME_DELETE"}))).status).toBe(200);
  const call=sql.mock.calls.find(([text])=>text.startsWith("DELETE"));
  expect(call?.[0]).toContain("WHERE id=$1 AND client_id=$2");expect(call?.[1]).toEqual([id,clientId]);
 });
 it("archives without deleting the record",async()=>{
  sql.mockResolvedValue({rows:[{id}]});expect((await POST(request({clientId,id,action:"AUDIENCE_VISIBILITY",archived:true}))).status).toBe(200);
  expect(sql.mock.calls.some(([text])=>text.startsWith("DELETE"))).toBe(false);
  expect(sql.mock.calls.find(([text])=>text.startsWith("UPDATE"))?.[1]).toEqual([id,clientId,true]);
 });
 it("does not claim deletion when no matching record exists",async()=>{
  sql.mockResolvedValueOnce({rows:[{id:clientId}]}).mockResolvedValueOnce({rows:[]});
  const result=await POST(request({clientId,id,action:"THEME_DELETE"}));expect(result.status).toBe(400);expect(await result.json()).not.toMatchObject({success:true});
 });
});
