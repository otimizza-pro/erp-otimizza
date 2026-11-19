import {describe,it,expect,vi} from "vitest";
vi.mock("@/lib/db/pool",()=>({query:vi.fn()}));
import {getFunnelMetrics,percentage,retentionMetrics,metricFiltersSchema} from "@/modules/marketing/metrics";
import {CreateLeadSchema,UpdateLeadSchema} from "@/modules/crm/schemas";
describe("Métricas da jornada",()=>{
 it("não inventa uma taxa para bases vazias",()=>{expect(percentage(0,0)).toBeNull();expect(retentionMetrics([],[]).retentionRate).toBeNull();});
 it("taxa de ganho usa apenas negócios encerrados",()=>{expect(percentage(3,3+2)).toBe(60);});
 it("retenção não é inflada por clientes novos",()=>{const result=retentionMetrics([{clientId:"a",mrr:100},{clientId:"b",mrr:200}],[{clientId:"a",mrr:150},{clientId:"c",mrr:500}]);expect(result.retentionRate).toBe(50);expect(result.churnRate).toBe(50);expect(result.expansionMrr).toBe(50);expect(result.lostMrr).toBe(200);expect(result.mrr).toBe(650);});
 it("reduzir receita sem perder cliente não conta como churn de cliente",()=>{const result=retentionMetrics([{clientId:"a",mrr:300}],[{clientId:"a",mrr:100}]);expect(result.retentionRate).toBe(100);expect(result.churnedClients).toBe(0);expect(result.lostMrr).toBe(200);});
 it("rejeita períodos invertidos e empresas inválidas",()=>{expect(metricFiltersSchema.safeParse({companyId:"invalid",start:"2026-11-01",end:"2026-11-18"}).success).toBe(false);expect(metricFiltersSchema.safeParse({companyId:"otimizza",start:"2026-11-20",end:"2026-11-01"}).success).toBe(false);});
 it("não presume Inbound nem WhatsApp na ausência de informação",()=>{const lead=CreateLeadSchema.parse({personType:"PJ",name:"Empresa"});expect(lead.acquisitionType).toBe("NAO_INFORMADO");expect(lead.firstContactChannel).toBeUndefined();});
 it("alterar qualificação não preenche aquisição nem canal",()=>{const change=UpdateLeadSchema.parse({status:"QUALIFICADO"});expect(change.acquisitionType).toBeUndefined();expect(change.firstContactChannel).toBeUndefined();});
});

import {query} from "@/lib/db/pool";
it("declares all six parameter types for every dashboard query, including stock queries", async()=>{
 vi.mocked(query).mockResolvedValue({rows:[{sent:0,canceled:0}],rowCount:1,command:"SELECT",oid:0,fields:[]});
 await getFunnelMetrics(metricFiltersSchema.parse({start:"2026-11-01",end:"2026-11-18"}));
 const calls=vi.mocked(query).mock.calls;expect(calls).toHaveLength(9);
 for(const [sql,values] of calls){expect(sql).toMatch(/^WITH metric_parameters AS/);for(const cast of ["$1::uuid","$2::date","$3::date","$4::text","$5::text","$6::text"])expect(sql).toContain(cast);expect(values).toHaveLength(6);expect(sql).not.toMatch(/\)WITH /);}
});
