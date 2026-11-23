import { describe, it, expect, vi } from "vitest";
import {
  getClientDnaContext,
  sanitizeBriefingDifferentials,
} from "@/modules/clients/dna-briefing-sync";
import { addIdentityAudiences } from "@/modules/clients/identity-audiences";

describe("DNA & Briefing Synchronization", () => {
  it("compiles full DNA context including commercial profile and real audiences", async () => {
    const mockQuery = vi.fn();

    // 1. Client query
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "client-1",
          name: "Studio TRG",
          trade_name: "Studio TRG",
          type: "PJ",
          contact_person_name: "Rondinelle Guedes",
        },
      ],
    });

    // 2. Identity query
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          market_niche: "Saúde física e reabilitação",
          value_proposition: "Recuperar a liberdade de movimento",
          brand_context: "O Studio TRG é liderado por Rondinelle Guedes.",
          tone_of_voice: ["Direto e didático"],
          differentials: ["Avaliação detalhada", "Acompanhamento próximo"],
          instagram_handle: "@treinador_rondinelle_guedes",
          website_url: "https://studiotrg.com.br",
          commercial_profile: {
            idealCustomer: "Pessoas com dores no corpo e lesões",
            commercialObjective: "Captar novos alunos para avaliação",
            requestedScope: "Gestão de redes sociais e vídeos",
          },
        },
      ],
    });

    // 3. Audiences query
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "aud-1",
          name: "Reabilitação",
          description: "Pessoas que convivem com dores musculares",
        },
        {
          id: "aud-2",
          name: "Correção Postural",
          description: "Jovens e adultos com problemas posturais",
        },
      ],
    });

    const ctx = await getClientDnaContext("client-1", { query: mockQuery });

    expect(ctx.companyName).toBe("Studio TRG");
    expect(ctx.contactName).toBe("Rondinelle Guedes");
    expect(ctx.category).toBe("Saúde física e reabilitação");
    expect(ctx.servicesOffered).toBe("Recuperar a liberdade de movimento");
    expect(ctx.instagramUrl).toBe("https://instagram.com/treinador_rondinelle_guedes");
    expect(ctx.websiteUrl).toBe("https://studiotrg.com.br");

    // Context contains commercial profile and audiences
    expect(ctx.compiledInitialNotes).toContain("Contexto da Marca");
    expect(ctx.compiledInitialNotes).toContain("Cliente Ideal (DNA Comercial)");
    expect(ctx.compiledInitialNotes).toContain("Públicos-Alvo Já Cadastrados no DNA");
    expect(ctx.compiledInitialNotes).toContain("1. Reabilitação");
    expect(ctx.compiledInitialNotes).toContain("2. Correção Postural");

    // initialExtractedIdentity contains the DNA seeds
    expect(ctx.initialExtractedIdentity.marketNiche).toBe("Saúde física e reabilitação");
    expect(ctx.initialExtractedIdentity.targetAudiences).toEqual(["Reabilitação", "Correção Postural"]);
  });

  it("sanitizes differentials to remove conversational chat noise", () => {
    const raw = [
      "Avaliação detalhada antes de definir o plano",
      "eu só disse um público, mas tem mais",
      "não sei",
      "Acompanhamento individualizado e seguro",
      "vamos lá",
    ];

    const clean = sanitizeBriefingDifferentials(raw);
    expect(clean).toEqual([
      "Avaliação detalhada antes de definir o plano",
      "Acompanhamento individualizado e seguro",
    ]);
  });

  it("prevents duplicate audiences and discards conversational sentence-level insertions", async () => {
    const mockDb = {
      query: vi.fn(),
    };

    // SELECT clients FOR UPDATE
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: "client-1" }] });
    // SELECT client_audiences (existing audiences)
    mockDb.query.mockResolvedValueOnce({
      rows: [
        { id: "aud-1", name: "Reabilitação", description: "Pessoas com dor" },
      ],
    });

    const rawAudiencesFromBriefing = [
      "Reabilitação", // Already exists
      "eu só disse um público, mas tem mais", // Conversational noise
      "Temos 03 publicos. Pessoas que sentem dor em alguma parte do corpo...", // Sentence noise
      "Condicionamento Físico: Pessoas buscando longevidade", // Valid new audience
    ];

    await addIdentityAudiences(mockDb as never, "client-1", rawAudiencesFromBriefing);

    // Only the valid new audience should be inserted
    const insertCalls = mockDb.query.mock.calls.filter(([sql]) =>
      typeof sql === "string" && sql.includes("INSERT INTO client_audiences")
    );

    expect(insertCalls.length).toBe(1);
    expect(insertCalls[0][1][1]).toBe("Condicionamento Físico");
    expect(insertCalls[0][1][2]).toBe("Pessoas buscando longevidade");
  });
});
