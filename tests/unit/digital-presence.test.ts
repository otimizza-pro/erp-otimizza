import {beforeEach,describe,expect,it,vi} from "vitest";
const {sql,generate,loadContext}=vi.hoisted(()=>({sql:vi.fn(),generate:vi.fn(),loadContext:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:sql}));
vi.mock("@/lib/ai/client-context",()=>({loadAiClientContext:loadContext,assertClientContext:(context:{missing:string[]})=>{if(context.missing.length)throw new Error("Contexto incompleto");},clientContextPrompt:(context:unknown)=>JSON.stringify(context)}));
vi.mock("@/lib/ai/openrouter",async importOriginal=>({...await importOriginal<typeof import("@/lib/ai/openrouter")>(),generateWithOpenRouter:generate}));
import {creationAreas} from "@/modules/digital-presence/catalog";
import {creationInputSchema,materialSchema} from "@/modules/digital-presence/schemas";
import {generatePresence,listPresence,savePresence,safePrototype,adsModel,webModel} from "@/modules/digital-presence/service";
const clientId="11111111-1111-4111-8111-111111111111";
const request={clientId,area:"meta-ads",outputIndex:0,audience:"Consumidores",guidance:"",inputs:{offer:"Móveis sob medida",objective:"Conversas no WhatsApp",region:"Guarapari"}};
const material={title:"Campanha de móveis",content:"Estrutura específica para a oferta e o público informados.",html:null,pending:[]};
beforeEach(()=>{sql.mockReset();generate.mockReset();loadContext.mockReset();loadContext.mockResolvedValue({companyId:clientId,company:{name:"Marcenaria"},identity:{target_audiences:["Consumidores"]},audiences:[],communicationProfile:{audienceTypes:[]},sources:["Identidade"],missing:[]});});
describe("Creation areas",()=>{
  it("covers all nine web and traffic menu items with unique instructions",()=>{expect(Object.keys(creationAreas)).toHaveLength(9);expect(new Set(Object.values(creationAreas).map(area=>area.instruction)).size).toBe(9);});
  it("validates required fields for each specialized form",()=>{for(const [area,definition] of Object.entries(creationAreas)){const inputs=Object.fromEntries(definition.fields.filter(f=>f.required).map(f=>[f.key,"Informação confirmada"]));expect(creationInputSchema.safeParse({...request,area,inputs}).success).toBe(true);for(const field of definition.fields.filter(f=>f.required)){expect(creationInputSchema.safeParse({...request,area,inputs:{...inputs,[field.key]:""}}).success).toBe(false);}}});
  it("rejects a form from another area and an unknown area",()=>{expect(creationInputSchema.safeParse({...request,inputs:{...request.inputs,services:"other"}}).success).toBe(false);expect(creationInputSchema.safeParse({...request,area:"invented"}).success).toBe(false);});
  it("rejects an unavailable deliverable",()=>{expect(creationInputSchema.safeParse({...request,area:"domains",outputIndex:3,inputs:{brand:"Marca",purpose:"Site"}}).success).toBe(false);});
  it("requires a company and an audience",()=>{expect(creationInputSchema.safeParse({...request,clientId:"otimizza"}).success).toBe(false);expect(creationInputSchema.safeParse({...request,audience:""}).success).toBe(false);});
});
describe("Real AI generation",()=>{
  it("passes the chosen company, audience and area prompt to the provider",async()=>{generate.mockResolvedValue({text:JSON.stringify(material),model:"test-model",source:"OPENROUTER"});const result=await generatePresence(request);expect(result.source).toBe("OPENROUTER");const call=generate.mock.calls[0][0];expect(call.messages[0].content).toContain("campanha > conjuntos > anúncios");expect(call.messages[1].content).toContain("Marcenaria");expect(call.messages[1].content).toContain("Móveis sob medida");expect(sql).not.toHaveBeenCalled();});
  it("blocks an audience outside the selected client before incurring AI usage",async()=>{await expect(generatePresence({...request,audience:"Pacientes"})).rejects.toThrow("público cadastrado");expect(generate).not.toHaveBeenCalled();});
  it("does not turn provider failure into a template or saved result",async()=>{generate.mockRejectedValue(new Error("provider failed"));await expect(generatePresence(request)).rejects.toThrow("provider failed");expect(sql).not.toHaveBeenCalled();});
  it("rejects empty provider output",async()=>{generate.mockResolvedValue({text:'{"title":"Vazio","content":"","html":null,"pending":[]}',source:"OPENROUTER",model:"test"});await expect(generatePresence(request)).rejects.toThrow();expect(sql).not.toHaveBeenCalled();});
  it("requires actual HTML when requested",async()=>{generate.mockResolvedValue({text:JSON.stringify(material),source:"OPENROUTER",model:"test"});await expect(generatePresence({...request,area:"landing-pages",outputIndex:1,inputs:{offer:"Serviço",objective:"Contato"}})).rejects.toThrow("HTML solicitado");});
  it("uses separate model settings",()=>{vi.stubEnv("OPENROUTER_ADS_MODEL","ads-model");vi.stubEnv("OPENROUTER_WEB_MODEL","web-model");expect(adsModel()).toBe("ads-model");expect(webModel()).toBe("web-model");vi.unstubAllEnvs();});
});
describe("HTML and persistence",()=>{
  it("removes executable HTML and locks down network, forms and scripts",()=>{const html=safePrototype('<html><head></head><body><script>alert(1)</script><img onerror="alert(2)" src="https://tracker.test/x"><iframe src="https://evil.test"></iframe><form action="https://evil.test"><input></form></body></html>');expect(html).not.toContain("<script");expect(html).not.toContain("onerror");expect(html).not.toContain("<iframe");expect(html).not.toContain('action="');expect(html).toContain("default-src 'none'");expect(html).toContain("form-action 'none'");});
  it("scopes saved versions by both client and area",async()=>{sql.mockResolvedValue({rows:[]});await listPresence(clientId,"google-ads");expect(sql.mock.calls[0][1]).toEqual([clientId,"google-ads"]);expect(sql.mock.calls[0][0]).toContain("client_id=$1 AND area=$2");});
  it("saves a new version without replacing prior materials",async()=>{sql.mockResolvedValue({rows:[{id:"saved"}]});expect(await savePresence(request,material,"admin","test-model")).toMatchObject({id:"saved"});const [statement,values]=sql.mock.calls[0];expect(statement).toContain("INSERT INTO digital_presence_materials");expect(statement).not.toContain("UPDATE");expect(values).toHaveLength(10);expect(values[0]).toBe(clientId);expect(values[1]).toBe("meta-ads");});
  it("does not report success when persistence fails",async()=>{sql.mockRejectedValue(new Error("database offline"));await expect(savePresence(request,material,"admin",null)).rejects.toThrow("database offline");});
  it("rejects empty review materials",()=>{expect(materialSchema.safeParse({...material,content:""}).success).toBe(false);});
});
