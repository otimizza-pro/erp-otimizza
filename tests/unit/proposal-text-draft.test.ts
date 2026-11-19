import { beforeEach, describe, expect, it, vi } from "vitest";
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ query: sql, withTransaction: (fn: (db: unknown) => unknown) => fn({ query: sql }) }));
import { getProposalTextDraft, saveProposalTextDraft } from "@/modules/proposals/text-draft";
import { saveCommercialDna } from "@/modules/crm/commercial-dna";
import { UpdateLeadSchema } from "@/modules/crm/schemas";
import { syncBriefingIdentity } from "@/modules/clients/briefing-identity";
const leadId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const draft = { currentScenario: "Precisa editar vídeos", partnershipFocus: "Explicar os serviços", trackingMetrics: "Vídeos entregues e aprovados" };
beforeEach(() => sql.mockReset());
describe("Persistência progressiva do cadastro", () => {
  it("restaura o texto da mesma identidade após conversão", async () => {
    sql.mockResolvedValueOnce({ rows: [{ converted_client_id: clientId }] }).mockResolvedValueOnce({ rows: [{ draft }] });
    expect(await getProposalTextDraft({ leadId })).toEqual(draft);
    expect(sql.mock.calls[1][0]).toContain("WHERE client_id=$1");
    expect(sql.mock.calls[1][1]).toEqual([clientId]);
  });
  it("salva o documento sem substituir o DNA ou alterar propostas emitidas", async () => {
    sql.mockResolvedValueOnce({ rows: [{ converted_client_id: null }] }).mockResolvedValueOnce({ rows: [] });
    expect(await saveProposalTextDraft({ leadId }, draft)).toEqual(draft);
    expect(sql.mock.calls[1][0]).toContain("jsonb_set(client_identities.commercial_profile");
    expect(sql.mock.calls[1][0]).not.toContain("UPDATE proposals");
    expect(sql.mock.calls[1][1][1]).toBe(JSON.stringify(draft));
  });
  it("preserva campos de DNA omitidos em atualizações parciais", async () => {
    const input = UpdateLeadSchema.parse({ commercialDna: { commercialObjective: "Educar pacientes" } });
    expect(input.commercialDna).toEqual({ commercialObjective: "Educar pacientes" });
    sql.mockResolvedValueOnce({ rows: [{ converted_client_id: null }] }).mockResolvedValueOnce({ rows: [{ brand_context: "Consultório", commercial_profile: { idealCustomer: "Pacientes", commercialObjective: "Educar pacientes", proposalTextDraft: draft } }] });
    await saveCommercialDna({ leadId }, input.commercialDna);
    expect(JSON.parse(sql.mock.calls[1][1][2])).toEqual({ commercialObjective: "Educar pacientes" });
    expect(sql.mock.calls[1][1][3]).toBe(false);
  });
  it("envia os públicos do briefing ao catálogo canônico", async () => {
    sql.mockResolvedValue({ rows: [] });
    await syncBriefingIdentity({ query: sql } as never,clientId,{ targetAudiences: ["Pacientes particulares"] });
    expect(sql.mock.calls.some(([statement]) => statement.includes("INSERT INTO client_audiences"))).toBe(true);
    const identitySql = sql.mock.calls.find(([statement]) => statement.includes("INSERT INTO client_identities"))![0];
    expect(identitySql).not.toContain("target_audiences");
  });
});
