import { beforeEach, describe, expect, it, vi } from "vitest";
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ query: sql, withTransaction: (callback: (db: unknown) => unknown) => callback({ query: sql }) }));
import { commercialDnaSchema, missingCommercialDna } from "@/modules/crm/commercial-dna-schema";
import { getCommercialDna, saveCommercialDna } from "@/modules/crm/commercial-dna";
import { loadProposalContext } from "@/lib/ai/client-context";
const leadId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
beforeEach(() => sql.mockReset());
describe("DNA comercial antes da oportunidade", () => {
  it("permite cadastro parcial e identifica o mínimo para a proposta", () => {
    const dna = commercialDnaSchema.parse({ businessDescription: "Médica nefrologista" });
    expect(missingCommercialDna(dna)).toHaveLength(3);
    expect(missingCommercialDna({ ...dna, idealCustomer: "Adultos", commercialObjective: "Educar pacientes", requestedScope: "Edição" })).toEqual([]);
  });
  it("busca o mesmo DNA do cliente ao acessar o lead convertido", async () => {
    sql.mockResolvedValueOnce({ rows: [{ id: leadId, converted_client_id: clientId }] }).mockResolvedValueOnce({ rows: [{ brand_context: "Consultório", commercial_profile: { requestedScope: "Edição de vídeos" } }] });
    const result = await getCommercialDna({ leadId });
    expect(sql.mock.calls[1][0]).toContain("WHERE client_id=$1");
    expect(sql.mock.calls[1][1]).toEqual([clientId]);
    expect(result.dna.requestedScope).toBe("Edição de vídeos");
  });
  it("salva na identidade do lead sem depender de oportunidade", async () => {
    sql.mockResolvedValueOnce({ rows: [{ id: leadId, converted_client_id: null }] }).mockResolvedValueOnce({ rows: [{ brand_context: "Consultório", commercial_profile: { idealCustomer: "Pacientes", commercialObjective: "Explicar serviços", requestedScope: "Edição" } }] });
    const result = await saveCommercialDna({ leadId }, { businessDescription: "Consultório", idealCustomer: "Pacientes", commercialObjective: "Explicar serviços", requestedScope: "Edição" });
    expect(sql.mock.calls[1][0]).toContain("INSERT INTO client_identities(lead_id");
    expect(sql.mock.calls[1][0]).not.toContain("crm_opportunities");
    expect(result.missing).toEqual([]);
  });
  it("inclui o DNA e o escopo restrito no contexto da IA do lead", async () => {
    sql.mockResolvedValueOnce({ rows: [{ name: "Médica", need_summary: "Precisa editar vídeos", converted_client_id: null }] }).mockResolvedValueOnce({ rows: [{ brand_context: "Consultório", commercial_profile: { idealCustomer: "Pacientes particulares", requestedScope: "Apenas edição, sem gravação" } }] });
    const context = await loadProposalContext({ leadId });
    expect(context.identity.commercial_profile).toMatchObject({ requestedScope: "Apenas edição, sem gravação" });
    expect(context.sources).toContain("DNA comercial inicial");
    expect(sql.mock.calls.every(([, values]) => values[0] === leadId)).toBe(true);
  });
});
