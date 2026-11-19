import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({query:vi.fn(),txQuery:vi.fn(),sync:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:mocks.query,withTransaction:(fn:(client:{query:typeof mocks.txQuery})=>unknown)=>fn({query:mocks.txQuery})}));
vi.mock("@/modules/clients/briefing-identity",()=>({syncBriefingIdentity:mocks.sync}));
vi.mock("@/modules/passwords/crypto",()=>({encryptPassword:()=>"encrypted"}));
import {POST} from "@/app/api/briefing/[token]/route";
const session={id:"session",company_name:"Empresa",status:"IN_PROGRESS",conversation_history:[],extracted_identity:{},progress_percent:0,credentials_saved:false};
const send=(body:unknown)=>POST(new NextRequest("https://erp.test/api/briefing/token",{method:"POST",body:JSON.stringify(body)}),{params:Promise.resolve({token:"token"})});
beforeEach(()=>{vi.resetAllMocks();mocks.query.mockResolvedValue({rows:[{...session}]});mocks.txQuery.mockResolvedValue({rows:[]});});
describe("Briefing responses",()=>{
 it("rejects arbitrary fields instead of modifying the extracted identity",async()=>{
  expect((await send({action:"DECISION",decision:"APPROVE",suggestedField:"unexpected",suggestedValue:"x"})).status).toBe(400);
  expect(mocks.query).not.toHaveBeenCalled();
 });
 it("does not say empty credentials were saved",async()=>{
  expect((await send({action:"SUBMIT_CREDENTIALS",credentials:{username:"",password:""}})).status).toBe(400);
  expect(mocks.txQuery).not.toHaveBeenCalled();
 });
 it("reports a vault failure instead of returning a success confirmation",async()=>{
  mocks.query.mockResolvedValueOnce({rows:[{...session}]}).mockResolvedValueOnce({rows:[{id:"owner"}]});
  mocks.txQuery.mockRejectedValue(new Error("vault unavailable"));
  const response=await send({action:"SUBMIT_CREDENTIALS",credentials:{username:"user",password:"secret"}});
  expect(response.status).toBe(503);expect((await response.json()).success).not.toBe(true);
 });
 it("does not complete the task before the required answers exist",async()=>{
  expect((await send({action:"DECISION",decision:"APPROVE",suggestedValue:"FINALIZE"})).status).toBe(400);
  expect(mocks.sync).not.toHaveBeenCalled();
 });
 it("preserves a completed briefing",async()=>{
  mocks.query.mockResolvedValue({rows:[{...session,status:"COMPLETED"}]});
  expect((await send({action:"MESSAGE",message:"replace"})).status).toBe(409);
  expect(mocks.txQuery).not.toHaveBeenCalled();
 });
 it("labels static examples honestly and does not silently approve them",async()=>{
  const response=await send({action:"DONT_KNOW"});
  expect(response.status).toBe(200);
  const data=(await response.json()).data;
  expect(data.conversationHistory.at(-1).text).toContain("Exemplo genérico");
  expect(data.extractedIdentity.targetAudience).toBeUndefined();
 });
});
