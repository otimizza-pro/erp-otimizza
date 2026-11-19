import {beforeEach,describe,expect,it,vi} from "vitest";
const {auth,context,list,generate,save}=vi.hoisted(()=>({auth:vi.fn(),context:vi.fn(),list:vi.fn(),generate:vi.fn(),save:vi.fn()}));
vi.mock("@/lib/auth/require-auth",()=>({requireAdminUser:auth}));
vi.mock("@/lib/ai/client-context",()=>({loadAiClientContext:context}));
vi.mock("@/modules/digital-presence/service",()=>({listPresence:list,generatePresence:generate,savePresence:save}));
import {GET,POST} from "@/app/api/digital-presence/route";
const clientId="11111111-1111-4111-8111-111111111111";
const payload={clientId,area:"meta-ads",action:"GENERATE",outputIndex:0,audience:"Consumidores",inputs:{offer:"Serviço",objective:"Contatos",region:"Guarapari"},guidance:""};
const request=(body:unknown)=>new Request("http://localhost/api/digital-presence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();auth.mockResolvedValue({id:"admin"});context.mockResolvedValue({audiences:[{name:"Consumidores"}],identity:{brand_context:"Empresa real"},brandVoice:{},sources:["Identidade"],missing:[]});list.mockResolvedValue([]);});
describe("Digital presence API",()=>{
  it("rejects unauthenticated reads and writes",async()=>{auth.mockRejectedValue(new Error("unauthorized"));expect((await GET(new Request("http://localhost/api/digital-presence"))).status).toBe(401);expect((await POST(request(payload))).status).toBe(401);expect(context).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();});
  it("rejects missing area-specific fields before calling the provider",async()=>{const response=await POST(request({...payload,inputs:{offer:""}}));expect(response.status).toBe(400);expect(generate).not.toHaveBeenCalled();});
  it("loads materials only for the requested company and area",async()=>{const response=await GET(new Request("http://localhost/api/digital-presence?clientId="+clientId+"&area=meta-ads"));expect(response.status).toBe(200);expect(list).toHaveBeenCalledWith(clientId,"meta-ads",false);});
  it("reports history failure explicitly rather than pretending it is empty",async()=>{list.mockRejectedValue(new Error("missing migration"));const result=await (await GET(new Request("http://localhost/api/digital-presence?clientId="+clientId+"&area=meta-ads"))).json();expect(result.historyError).toContain("031");expect(result.context.summary).toBe("Empresa real");});
  it("returns a failure when AI fails, with no heuristic success",async()=>{generate.mockRejectedValue(new Error("offline"));const response=await POST(request(payload));expect(response.status).toBe(503);expect(await response.json()).toMatchObject({success:false});expect(save).not.toHaveBeenCalled();});
  it("does not claim a failed save succeeded",async()=>{save.mockRejectedValue(new Error("database offline"));const response=await POST(request({...payload,action:"SAVE",model:"test",material:{title:"Campanha",content:"Texto completo de revisão para uma campanha real.",html:null,pending:[]}}));expect(response.status).toBe(503);expect(await response.json()).toMatchObject({success:false});});
});
