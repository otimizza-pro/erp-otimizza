import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pool
vi.mock("@/lib/db/pool", () => ({
  query: vi.fn(),
  withTransaction: vi.fn(async (cb) => {
    const mockDb = {
      query: vi.fn(),
    };
    return cb(mockDb);
  }),
}));

// Mock openrouter
vi.mock("@/lib/ai/openrouter", () => ({
  generateWithOpenRouter: vi.fn().mockResolvedValue({
    text: JSON.stringify([
      {
        title: "3 erros no controle de caixa que sugam seu lucro",
        pillar_name: "Educativo",
        theme_name: "Gestão Financeira",
        angle: "Erro Comum",
        format: "Carrossel",
        target_audience: "Pequenos Empresários",
        pain_or_desire: "Falta de clareza financeira",
        goal: "Educar e gerar autoridade",
        rationale: "Aborda a dor mais frequente dos donos de negócios sem termos técnicos pesados.",
      },
    ]),
    model: "mock-model",
  }),
  strategyModel: vi.fn().mockReturnValue("mock-strategy"),
  parseAiJson: vi.fn((text, schema) => schema.parse(JSON.parse(text))),
  GLOBAL_HUMANIZATION_RULES: "Regras mock",
}));

// Mock client-context
vi.mock("@/lib/ai/client-context", () => ({
  loadAiClientContext: vi.fn().mockResolvedValue({
    company: { name: "Otimizza Teste" },
    identity: {
      value_proposition: "Crescimento seguro para empresas",
      differentials: ["Atendimento próximo", "Foco em dados"],
      tone_of_voice: ["Consultivo", "Prático"],
    },
    audiences: [
      {
        name: "Pequenos Empresários",
        pain_points: ["Falta de clareza financeira"],
        desires: ["Mais lucro"],
        objections: ["Custa caro"],
      },
    ],
  }),
}));

import { query, withTransaction } from "@/lib/db/pool";
import {
  listPillarsAndLines,
  listBrainstormIdeas,
  generateBrainstormIdeas,
  saveBrainstormIdea,
  rejectBrainstormIdea,
  restoreBrainstormIdea,
  convertIdeaToHeadlines,
} from "@/modules/headlines/brainstorm-service";

describe("Brainstorm Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists pillars and lines for client", async () => {
    (query as any)
      .mockResolvedValueOnce({ rows: [{ id: "p-1", name: "Educativo" }] })
      .mockResolvedValueOnce({
        rows: [{ id: "l-1", pillar_id: "p-1", pillar_name: "Educativo", theme: "Gestão Financeira" }],
      });

    const result = await listPillarsAndLines("client-123");
    expect(result.pillars).toHaveLength(1);
    expect(result.pillars[0].name).toBe("Educativo");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].theme).toBe("Gestão Financeira");
  });

  it("generates brainstorm ideas feeding approved and rejected history into the prompt", async () => {
    (query as any)
      .mockResolvedValueOnce({ rows: [{ id: "p-1", name: "Educativo" }] }) // pillars
      .mockResolvedValueOnce({
        rows: [{ id: "l-1", pillar_id: "p-1", pillar_name: "Educativo", theme: "Gestão Financeira" }],
      }) // lines
      .mockResolvedValueOnce({ rows: [] }) // recent posts
      .mockResolvedValueOnce({ rows: [{ title: "Ideia Aprovada Anterior" }] }) // approved ideas
      .mockResolvedValueOnce({ rows: [{ title: "Ideia Rejeitada Proibida", rejection_reason: "Muito rasa" }] }); // rejected ideas blacklist

    const ideas = await generateBrainstormIdeas({
      clientId: "client-123",
      userId: "user-1",
      count: 1,
    });

    expect(ideas).toHaveLength(1);
    expect(ideas[0].title).toBe("3 erros no controle de caixa que sugam seu lucro");
    expect(ideas[0].pillar_name).toBe("Educativo");
    expect(ideas[0].theme_name).toBe("Gestão Financeira");
  });

  it("saves a brainstorm idea with SAVED_FOR_LATER status", async () => {
    (query as any).mockResolvedValueOnce({
      rows: [
        {
          id: "idea-1",
          client_id: "client-123",
          title: "Como precificar serviços",
          status: "SAVED_FOR_LATER",
        },
      ],
    });

    const saved = await saveBrainstormIdea({
      clientId: "client-123",
      userId: "user-1",
      title: "Como precificar serviços",
      pillarName: "Educativo",
      themeName: "Precificação",
      status: "SAVED_FOR_LATER",
    });

    expect(saved.id).toBe("idea-1");
    expect(saved.title).toBe("Como precificar serviços");
    expect(saved.status).toBe("SAVED_FOR_LATER");
  });

  it("rejects an idea and stores rejection reason for blacklist learning", async () => {
    (query as any).mockResolvedValueOnce({ rowCount: 1 });

    await rejectBrainstormIdea("idea-1", "Tema muito clichê");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE content_brainstorm_ideas"),
      ["idea-1", "Tema muito clichê"]
    );
  });

  it("restores a rejected idea back to the mural", async () => {
    (query as any).mockResolvedValueOnce({ rowCount: 1 });

    await restoreBrainstormIdea("idea-1");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE content_brainstorm_ideas"),
      ["idea-1"]
    );
  });

  it("converts a brainstorm idea to headlines workflow", async () => {
    (withTransaction as any).mockImplementationOnce(async (cb: any) => {
      const mockDb = {
        query: vi.fn(),
      };
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "idea-1",
            client_id: "client-123",
            title: "Como precificar serviços",
            format: "Carrossel",
            target_audience: "Empreendedores",
            content_id: null,
            workspace_id: null,
          },
        ],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: "content-1" }],
      });
      mockDb.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: "workspace-1" }],
      });
      mockDb.query.mockResolvedValueOnce({
        rowCount: 1,
      });

      return cb(mockDb);
    });

    const result = await convertIdeaToHeadlines("idea-1", "user-1");
    expect(result.workspaceId).toBe("workspace-1");
    expect(result.contentId).toBe("content-1");
  });
});
