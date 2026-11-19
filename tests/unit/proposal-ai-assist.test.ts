import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { auth, context, generate } = vi.hoisted(() => ({ auth: vi.fn(), context: vi.fn(), generate: vi.fn() }));
vi.mock("@/lib/auth/require-auth", () => ({ requireAdminUser: auth }));
vi.mock("@/lib/ai/client-context", () => ({ loadProposalContext: context, clientContextPrompt: () => "Contexto do destinatário" }));
vi.mock("@/lib/ai/openrouter", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/ai/openrouter")>(), generateWithOpenRouter: generate }));
import { POST } from "@/app/api/proposals/ai-assist/route";
const request = (data: Record<string, unknown>) => new NextRequest("http://localhost/api/proposals/ai-assist", { method: "POST", body: JSON.stringify(data) });
beforeEach(() => {
  vi.resetAllMocks(); auth.mockResolvedValue({ id: "admin" });
  context.mockResolvedValue({ companyId: "lead", sources: ["Cadastro do lead"], identity: { commercial_profile: { idealCustomer: "Pacientes particulares", commercialObjective: "Explicar os atendimentos", requestedScope: "Somente edição de vídeos enviados pela médica" } } });
});
describe("IA de propostas por finalidade", () => {
  it("melhora somente o cenário, sem carregar contexto ou aceitar alterações nos outros campos", async () => {
    generate.mockResolvedValue({ text: JSON.stringify({ currentScenario: "O negócio precisa organizar a comunicação.", partnershipFocus: "Não deve alterar" }), source: "OPENROUTER", model: "modelo-configurado" });
    const response = await POST(request({ action: "POLISH_SCENARIO", currentScenario: "precisa organizar comunicação" }));
    const data = await response.json();
    expect(response.status).toBe(200); expect(data.currentScenario).toBeTruthy();
    expect(data.partnershipFocus).toBeUndefined(); expect(data.trackingMetrics).toBeUndefined();
    expect(context).not.toHaveBeenCalled();
    expect(generate.mock.calls[0][0].messages[0].content).toContain("Preserve integralmente o sentido");
  });
  it("gera foco e indicadores sem alterar o cenário", async () => {
    generate.mockResolvedValue({ text: JSON.stringify({ partnershipFocus: "Organizar a captação.", trackingMetrics: "Contatos qualificados e conversão.", currentScenario: "Não deve substituir" }), source: "OPENROUTER", model: "modelo-configurado" });
    const response = await POST(request({ action: "GENERATE_STRATEGY", leadId: "11111111-1111-4111-8111-111111111111", currentScenario: "Depende de indicações e não acompanha os contatos." }));
    const data = await response.json();
    expect(data.partnershipFocus).toBeTruthy(); expect(data.trackingMetrics).toBeTruthy();
    expect(data.currentScenario).toBeUndefined();
    expect(context).toHaveBeenCalled();
    expect(generate.mock.calls[0][0].messages[0].content).toContain("Não prometa serviços");
  });
  it("rejeita cenário vazio antes de chamar o provedor", async () => {
    expect((await POST(request({ action: "GENERATE_STRATEGY", currentScenario: " " }))).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it("não gera estratégia genérica quando falta o DNA mínimo", async () => {
    context.mockResolvedValue({ companyId: "lead", sources: [], identity: {} });
    const response = await POST(request({ action: "GENERATE_STRATEGY", currentScenario: "Precisa de edição de vídeos." }));
    const data = await response.json();
    expect(response.status).toBe(422);
    expect(data.code).toBe("AI_PROPOSAL_DNA_INCOMPLETE");
    expect(data.error).toContain("Cliente ideal");
    expect(data.error).toContain("Objetivo comercial");
    expect(generate).not.toHaveBeenCalled();
  });
  it("não confirma sucesso para uma resposta incompleta", async () => {
    generate.mockResolvedValue({ text: '{"partnershipFocus":"Só um campo"}', source: "OPENROUTER", model: "modelo" });
    const response = await POST(request({ action: "GENERATE_STRATEGY", currentScenario: "Precisa organizar os canais." }));
    expect(response.status).toBe(502); expect((await response.json()).success).toBe(false);
  });
  it("mantém as três strings para o modo legado", async () => {
    generate.mockResolvedValue({ text: JSON.stringify({ currentScenario: "Cenário", partnershipFocus: "Foco", trackingMetrics: "Indicadores" }), source: "OPENROUTER", model: "modelo" });
    const response = await POST(request({ currentScenario: "Cenário" }));
    expect((await response.json()).trackingMetrics).toBe("Indicadores");
  });
  it("exige autenticação", async () => {
    auth.mockRejectedValue(new Error("Não autorizado"));
    expect((await POST(request({ action: "POLISH_SCENARIO", currentScenario: "Teste" }))).status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });
});
