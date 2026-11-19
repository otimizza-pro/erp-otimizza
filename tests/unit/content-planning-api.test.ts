import {describe,it,expect,vi,beforeEach} from "vitest";
import {NextRequest} from "next/server";
const {sql,auth,loadContext}=vi.hoisted(()=>({sql:vi.fn(),auth:vi.fn(),loadContext:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query:sql,withTransaction:async(fn:(client:{query:typeof sql})=>unknown)=>fn({query:sql})}));
vi.mock("@/lib/auth/require-auth",()=>({requireAdminUser:auth}));
vi.mock("@/lib/ai/client-context",()=>({loadAiClientContext:loadContext,assertClientContext:vi.fn(),clientContextPrompt:vi.fn()}));
import {POST as savePost} from "@/app/api/content-studio/posts/route";
import {POST as saveCalendarItem} from "@/app/api/content-studio/calendar/route";
import {POST as planCalendar} from "@/app/api/content-studio/calendar/plan/route";
const clientId="11111111-1111-4111-8111-111111111111",themeId="22222222-2222-4222-8222-222222222222";
const brief={themeId,speaker:"Empresa",voice:"Institucional",audience:"Consumidores",funnel:"TOP",journey:"DISCOVERY",goal:"Ajudar a planejar",pain:"NOT_APPLICABLE",tone:"Didático",cta:"Salvar"};
const item={title:"Cozinha pequena",centralIdea:"Como aproveitar espaço",scheduledDate:"2026-11-20",scheduledTime:"18:00",format:"Reels",editorialLineId:themeId,editorialBrief:brief,notes:""};
const request=(data:unknown)=>new NextRequest("http://localhost/api/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
beforeEach(()=>{sql.mockReset();auth.mockReset();loadContext.mockReset();auth.mockResolvedValue({id:"admin"});loadContext.mockResolvedValue({companyId:clientId,company:{name:"Marca"},identity:{target_audiences:["Consumidores"]},audiences:[],brandVoice:{},editorialLines:[{id:themeId,pillar_name:"Ambientes",theme:"Cozinhas"}],communicationProfile:{speakerTypes:["Empresa"],contentVoices:["Institucional"],audienceTypes:["Consumidores"],details:""},sources:[],missing:[]});});
function expectValidBindings(){for(const [query,values] of sql.mock.calls){const indices=Array.from(String(query).matchAll(/\$(\d+)/g),match=>Number(match[1]));expect(values).toHaveLength(Math.max(...indices));}}
describe("Content planning persistence",()=>{
 it("guards writes before touching the database",async()=>{auth.mockRejectedValue(new Error("unauthorized"));const response=await planCalendar(request({}));expect(response.status).toBe(401);expect(sql).not.toHaveBeenCalled();expect(loadContext).not.toHaveBeenCalled();});
 it("saves feed context with correctly bound SQL parameters",async()=>{sql.mockResolvedValue({rows:[{id:"saved"}]});expect((await savePost(request({clientId,title:"Post",editorialBrief:brief}))).status).toBe(200);expectValidBindings();expect(sql.mock.calls[0][1]).toHaveLength(19);});
 it("saves manual calendar item context with 22 bindings",async()=>{sql.mockResolvedValue({rows:[{id:"saved"}]});expect((await saveCalendarItem(request({clientId,...item}))).status).toBe(201);expectValidBindings();expect(sql.mock.calls[0][1]).toHaveLength(22);});
 it("does not persist dates outside requested month",async()=>{const response=await planCalendar(request({action:"SAVE",clientId,month:"2026-12",items:[item]}));expect(response.status).toBe(400);expect(sql).not.toHaveBeenCalled();});
 it("adds planned items without changing existing posts",async()=>{sql.mockResolvedValueOnce({rows:[{id:clientId}]}).mockResolvedValueOnce({rows:[{id:themeId}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]});const response=await planCalendar(request({action:"SAVE",clientId,month:"2026-11",items:[item]}));expect(await response.json()).toMatchObject({success:true,added:1});expectValidBindings();expect(sql.mock.calls.some(([q])=>/DELETE|UPDATE content_calendar_items/.test(q))).toBe(false);});
 it("does not duplicate same title on same date",async()=>{sql.mockResolvedValueOnce({rows:[{id:clientId}]}).mockResolvedValueOnce({rows:[{id:themeId}]}).mockResolvedValueOnce({rows:[{id:"existing"}]});const response=await planCalendar(request({action:"SAVE",clientId,month:"2026-11",items:[item]}));expect(await response.json()).toMatchObject({success:true,added:0});expect(sql.mock.calls.some(([q])=>q.startsWith("INSERT"))).toBe(false);});
});
