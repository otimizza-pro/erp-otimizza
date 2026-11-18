import {beforeEach,describe,expect,it,vi} from "vitest";
const {query,auth}=vi.hoisted(()=>({query:vi.fn(),auth:vi.fn()}));
vi.mock("@/lib/db/pool",()=>({query}));
vi.mock("@/lib/auth/require-auth",()=>({requireAdminUser:auth}));
import {GET,PUT} from "@/app/api/operations/checklists/route";
const client="11111111-1111-4111-8111-111111111111";
describe("Acompanhamento operacional por cliente",()=>{
 beforeEach(()=>{vi.resetAllMocks();auth.mockResolvedValue({id:"22222222-2222-4222-8222-222222222222"});query.mockResolvedValue({rows:[]});});
 it("recusa leitura e gravação sem sessão antes de acessar o banco",async()=>{auth.mockRejectedValue(new Error("UNAUTHORIZED"));expect((await GET(new Request("http://localhost?scope=otimizza&area=acquisition"))).status).toBe(401);expect((await PUT(new Request("http://localhost",{method:"PUT",body:"{}"}))).status).toBe(401);expect(query).not.toHaveBeenCalled();});
 it("consulta apenas o cliente e a área solicitados",async()=>{await GET(new Request("http://localhost?scope="+client+"&area=meta-ads"));expect(query.mock.calls[0][1]).toEqual([client,"meta-ads"]);expect(query.mock.calls[0][0]).toContain("scope_key = $1 AND area = $2");});
 it("recusa tarefas de outro pilar sem gravar",async()=>{const response=await PUT(new Request("http://localhost",{method:"PUT",body:JSON.stringify({scope:client,area:"acquisition",tasks:{"Executar onboarding":{status:"RUNNING",notes:""}}})}));expect(response.status).toBe(400);expect(query).not.toHaveBeenCalled();});
 it("salva configuração na empresa própria sem inventar um cliente",async()=>{const response=await PUT(new Request("http://localhost",{method:"PUT",body:JSON.stringify({scope:"otimizza",area:"retention",tasks:{"Executar onboarding":{status:"CONFIGURED",notes:"Responsável definido"}}})}));expect(response.status).toBe(200);expect(query.mock.calls[0][1].slice(0,3)).toEqual(["otimizza",null,"retention"]);});
 it("retorna erro explícito quando o banco não está disponível",async()=>{query.mockRejectedValue(new Error("offline"));const response=await GET(new Request("http://localhost?scope=otimizza&area=acquisition"));expect(response.status).toBe(500);expect((await response.json()).error).toContain("migração 025");});
});