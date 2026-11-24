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
import { generateWithOpenRouter } from "@/lib/ai/openrouter";
import { seasonalSources } from "@/modules/headlines/brainstorm-sources";
import {
  listPillarsAndLines,
  listBrainstormIdeas,
  generateBrainstormIdeas,
  searchBrainstormIdeas,
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
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ id: "p-1", name: "Educativo" }] } as never)
      .mockResolvedValueOnce({
        rows: [{ id: "l-1", pillar_id: "p-1", pillar_name: "Educativo", theme: "Gestão Financeira" }],
      } as never);

    const result = await listPillarsAndLines("client-123");
    expect(result.pillars).toHaveLength(1);
    expect(result.pillars[0].name).toBe("Educativo");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].theme).toBe("Gestão Financeira");
  });

  it("generates brainstorm ideas feeding approved and rejected history into the prompt", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ id: "p-1", name: "Educativo" }] } as never) // pillars
      .mockResolvedValueOnce({
        rows: [{ id: "l-1", pillar_id: "p-1", pillar_name: "Educativo", theme: "Gestão Financeira" }],
      } as never) // lines
      .mockResolvedValueOnce({ rows: [] } as never) // recent posts
      .mockResolvedValueOnce({ rows: [{ title: "Ideia Aprovada Anterior" }] } as never) // approved ideas
      .mockResolvedValueOnce({ rows: [{ title: "Ideia Rejeitada Proibida", rejection_reason: "Muito rasa" }] } as never); // rejected ideas blacklist

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

  it("returns persisted search results without fetching sources or calling the model during the refresh interval", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    try {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [{ id: "saved", is_new: false }] } as never);
      const result = await searchBrainstormIdeas({ clientId: "client-123", userId: "user-1", mode: "NEWS" });
      expect(result.ideas).toEqual([{ id: "saved", is_new: false }]);
      expect(result.newCount).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(generateWithOpenRouter).not.toHaveBeenCalled();
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("skips the model when the feed only contains sources already evaluated", async () => {
    const date = new Date().toUTCString();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      `<rss><channel><item><title>Notícia do setor - Jornal</title><pubDate>${date}</pubDate><link>https://news.google.com/rss/articles/test</link></item></channel></rss>`,
    ));
    try {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: "search", checked_sources: ["noticia do setor"] }] } as never)
        .mockResolvedValueOnce({ rows: [{ title: "Ideia anterior", status: "IDEA" }] } as never)
        .mockResolvedValueOnce({ rows: [{ id: "saved", is_new: false }] } as never);
      const execute = vi.fn().mockResolvedValue({ rowCount: 1 });
      vi.mocked(withTransaction).mockImplementationOnce((async (callback: (db: { query: typeof execute }) => Promise<unknown>) =>
        callback({ query: execute })) as never);
      const result = await searchBrainstormIdeas({ clientId: "client-123", userId: "user-1", mode: "NEWS" });
      expect(result.ideas).toEqual([{ id: "saved", is_new: false }]);
      expect(execute).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(generateWithOpenRouter).not.toHaveBeenCalled();
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("includes seasonal dates across the year boundary and computes movable dates", () => {
    const endOfYear = seasonalSources("2026-11-20");
    expect(endOfYear.map(source => source.date)).toContain("2027-01-01");
    expect(endOfYear).toContainEqual(expect.objectContaining({ title: "Black Friday", date: "2026-11-27" }));
    expect(seasonalSources("2027-01-02")).toContainEqual(expect.objectContaining({ title: expect.stringContaining("Carnaval"), date: "2027-02-09" }));
    expect(seasonalSources("2027-01-01").every(source => source.date <= "2027-03-01")).toBe(true);
  });

  it("sends only unseen sources and persists their provenance alongside earlier ideas", async () => {
    const rssItem = (title: string, id: string) =>
      `<item><title>${title} - Jornal</title><pubDate>${new Date().toUTCString()}</pubDate><link>https://news.google.com/rss/articles/${id}</link></item>`;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      `<rss><channel>${rssItem("Notícia anterior", "old")}${rssItem("Notícia nova", "new")}</channel></rss>`,
    ));
    try {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ id: "search", checked_sources: ["noticia anterior"] }] } as never)
        .mockResolvedValueOnce({ rows: [{ title: "Ideia anterior", status: "IDEA" }] } as never);
      for (let index = 0; index < 5; index += 1) {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);
      }
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: "new", is_new: true }, { id: "old", is_new: false }],
      } as never);
      vi.mocked(generateWithOpenRouter).mockResolvedValueOnce({
        text: JSON.stringify([{
          title: "Pauta nova", pillar_name: "", theme_name: "", angle: "Contexto prático",
          format: "Reels", target_audience: "", pain_or_desire: "", goal: "", rationale: "", source_index: 0,
        }]),
        model: "mock-model",
      } as never);
      const execute = vi.fn().mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: "new" }] }).mockResolvedValueOnce({ rowCount: 1 });
      vi.mocked(withTransaction).mockImplementationOnce((async (callback: (db: { query: typeof execute }) => Promise<unknown>) =>
        callback({ query: execute })) as never);

      const result = await searchBrainstormIdeas({ clientId: "client-123", userId: "user-1", mode: "NEWS" });
      const prompt = JSON.parse(vi.mocked(generateWithOpenRouter).mock.calls[0][0].messages[1].content);
      expect(prompt.temas_ja_encontrados).toEqual(["Ideia anterior"]);
      expect(prompt.fontes_novas).toEqual([expect.objectContaining({ index: 0, title: "Notícia nova - Jornal" })]);
      expect(execute).toHaveBeenCalledWith(expect.stringContaining("SET search_id"),
        ["new", "search", "Notícia nova - Jornal", "https://news.google.com/rss/articles/new", expect.any(String)]);
      expect(result).toMatchObject({ newCount: 1, ideas: [{ id: "new", is_new: true }, { id: "old", is_new: false }] });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("saves a brainstorm idea with SAVED_FOR_LATER status", async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          id: "idea-1",
          client_id: "client-123",
          title: "Como precificar serviços",
          status: "SAVED_FOR_LATER",
        },
      ],
    } as never);

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
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 } as never);

    await rejectBrainstormIdea("idea-1", "Tema muito clichê");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE content_brainstorm_ideas"),
      ["idea-1", "Tema muito clichê"]
    );
  });

  it("restores a rejected idea back to the mural", async () => {
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 } as never);

    await restoreBrainstormIdea("idea-1");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE content_brainstorm_ideas"),
      ["idea-1"]
    );
  });

  it("converts a brainstorm idea to headlines workflow", async () => {
    vi.mocked(withTransaction).mockImplementationOnce((async (cb: (db: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) => {
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
    }) as never);

    const result = await convertIdeaToHeadlines("idea-1", "user-1");
    expect(result.workspaceId).toBe("workspace-1");
    expect(result.contentId).toBe("content-1");
  });

  it("usa o post planejado e cria o workspace sem inserir outro post no calendário", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "idea-1", client_id: "client-123", title: "Ideia do mês", format: "Reels" }] })
      .mockResolvedValueOnce({ rows: [{ id: "planned-post" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: "workspace-1" }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    vi.mocked(withTransaction).mockImplementationOnce((async (callback: (db: { query: typeof execute }) => Promise<unknown>) =>
      callback({ query: execute })) as never);

    const result = await convertIdeaToHeadlines("idea-1", "user-1", { id: "planned-post", clientId: "client-123" });

    expect(result).toEqual({ ideaId: "idea-1", workspaceId: "workspace-1", contentId: "planned-post" });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("SET central_idea"), ["planned-post", "Ideia do mês", null, "Reels", null, false, null, null, null]);
    expect(execute.mock.calls.some(([sql]) => sql.includes("INSERT INTO content_calendar_items"))).toBe(false);
  });

  it("vincula uma ideia ao post planejado sem iniciar headlines", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "idea", client_id: "client", title: "Pauta", format: "Reels" }] })
      .mockResolvedValueOnce({ rows: [{ id: "post", status: "PLANNED" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValue({ rowCount: 1 });
    vi.mocked(withTransaction).mockImplementationOnce((async (callback: (db: { query: typeof execute }) => Promise<unknown>) =>
      callback({ query: execute })) as never);
    expect(await convertIdeaToHeadlines("idea", "user", { id: "post", clientId: "client" }, true))
      .toMatchObject({ contentId: "post", ideaId: "idea" });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("status = 'SAVED_FOR_LATER'"), ["idea", "post"]);
    expect(execute.mock.calls.some(([sql]) => sql.includes("INSERT INTO"))).toBe(false);
  });
});
