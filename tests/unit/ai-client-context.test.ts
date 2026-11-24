import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ query }));
import { assertClientContext, clientContextPrompt, loadAiClientContext } from "@/lib/ai/client-context";

const clientId = "11111111-1111-4111-8111-111111111111";
describe("Contexto da empresa nas chamadas de IA", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    query.mockImplementation((sql: string, values: string[]) => Promise.resolve({ rows:
      sql.includes("FROM clients ") ? [{ name: values[0] === clientId ? "Marcenaria" : "Distribuidora", city: "Cidade", password: "não enviar" }] :
      sql.includes("FROM client_identities") ? [{ brand_context: "Móveis planejados", target_audiences: ["Famílias"], differentials: ["Projeto personalizado"], forbidden_words: ["milagre"], api_key: "não enviar" }] :
      sql.includes("FROM client_audiences") ? [{ name: "Famílias", description: "Pessoas planejando uma reforma", objections: ["Prazo de entrega"] }] :
      sql.includes("FROM client_brand_voice_presets") ? [{ custom_guidelines: "Explicar materiais sem jargões" }] :
      sql.includes("FROM client_editorial_lines") ? [{id:"33333333-3333-4333-8333-333333333333",pillar_name:"Ambientes",theme:"Cozinhas"}] :
      sql.includes("FROM client_catalog_items") ? [{ name: "Armários Planejados", item_type: "SERVICE", deliverables: ["Medição no local"] }] : []
    }));
  });
  it("inclui características, público, objeções e restrições da marca", async () => {
    const context = await loadAiClientContext(clientId);
    assertClientContext(context);
    const prompt = clientContextPrompt(context);
    expect(prompt).toContain("Marcenaria");
    expect(prompt).toContain("Projeto personalizado");
    expect(prompt).toContain("Prazo de entrega");
    expect(prompt).toContain("Explicar materiais sem jargões");
    expect(prompt).toContain("Armários Planejados");
    expect(prompt).not.toContain("não enviar");
  });
  it("todas as consultas usam somente o ID da empresa solicitada", async () => {
    await loadAiClientContext(clientId);
    expect(query).toHaveBeenCalledTimes(6);
    for (const [, values] of query.mock.calls) expect(values).toEqual([clientId]);
    const other = await loadAiClientContext("22222222-2222-4222-8222-222222222222");
    expect(other.company.name).toBe("Distribuidora");
  });
  it("preserva o ID do tema para validar o vínculo no fluxo de criação",async()=>{
    const context=await loadAiClientContext(clientId);
    expect(context.editorialLines[0]).toMatchObject({id:"33333333-3333-4333-8333-333333333333",theme:"Cozinhas"});
  });
  it("não preenche uma identidade ausente com o perfil da Otimizza", async () => {
    query.mockImplementation((sql: string) => Promise.resolve({ rows: sql.includes("FROM clients ") ? [{ name: "Cliente sem identidade" }] : [] }));
    const context = await loadAiClientContext(clientId);
    expect(context.identity).toEqual({});
    expect(() => assertClientContext(context)).toThrow(/Complete a identidade/);
  });
  it("falha de consulta interrompe a geração em vez de devolver contexto genérico", async () => {
    query.mockRejectedValue(new Error("database offline"));
    await expect(loadAiClientContext(clientId)).rejects.toMatchObject({ code: "AI_CONTEXT_UNAVAILABLE", status: 503 });
  });
});
