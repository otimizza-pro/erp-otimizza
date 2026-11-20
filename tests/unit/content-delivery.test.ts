import { describe, expect, it } from "vitest";
import { deliveryAction, publicationReady, reviewMaterials, type Review } from "@/modules/clients/content-delivery";
import { reuseCalendarIdeas } from "@/modules/clients/calendar-plan";
import type { AiClientContext } from "@/lib/ai/client-context";

const approved = (material: Review["material"], text: string): Review => ({
  id: "review-" + material, material, version: 1, snapshot: { text }, decision: "APPROVED",
  submitted_by: "admin", submitted_at: "2026-11-20", decided_by: "admin", decided_at: "2026-11-20", comment: null,
});

describe("entrega de conteúdo", () => {
  it("preserva a aprovação da arte quando muda somente a legenda", () => {
    const reviews = [approved("image_url", "https://example.com/img"), approved("selected_caption", "Texto original")];
    const before = reviewMaterials({ selected_caption: "Texto original", image_url: "https://example.com/img" }, reviews);
    expect(publicationReady(before)).toBe(true);
    const after = reviewMaterials({ selected_caption: "Novo texto", image_url: "https://example.com/img" }, reviews);
    expect(after.find(item => item.key === "image_url")?.current?.decision).toBe("APPROVED");
    expect(after.find(item => item.key === "selected_caption")?.current).toBeNull();
    expect(publicationReady(after)).toBe(false);
  });

  it("impede publicar com material desatualizado mesmo se o texto aprovado continuar salvo", () => {
    expect(publicationReady(reviewMaterials({ selected_caption: "Legenda", stale_materials: ["selected_caption"] }, [
      approved("selected_caption", "Legenda"),
    ]))).toBe(false);
  });

  it("exige link HTTP ou HTTPS para a publicação", () => {
    const data = { action: "PUBLISH", platform: "Instagram", publishedAt: "2026-11-19T19:00:00Z", primaryMetric: "clicks" };
    expect(deliveryAction.safeParse({ ...data, url: "javascript:alert(1)" }).success).toBe(false);
    expect(deliveryAction.safeParse({ ...data, url: "https://instagram.com/p/teste" }).success).toBe(true);
  });

  it("reaproveita a pauta do banco em data livre antes da referência sazonal", () => {
    const theme = "11111111-1111-4111-8111-111111111111";
    const id = "22222222-2222-4222-8222-222222222222";
    const context = { audiences: [{ name: "Comerciantes" }], editorialLines: [{ id: theme }],
      communicationProfile: { speakerTypes: ["Marca"], contentVoices: ["Institucional"] },
      identity: { tone_of_voice: "Direto", default_ctas: ["Saiba mais"] } } as unknown as AiClientContext;
    const items = reuseCalendarIdeas(context, [{
      id, title: "Pauta sazonal", target_audience: "Comerciantes", editorial_line_id: theme,
      source_date: "2026-11-27", format: "Reels", angle: "Guia", goal: "Educar", rationale: "Referência do banco",
    }], [{ title: "Outro tema", scheduled_date: "2026-11-27" }], "2026-11", 1, "2026-11-20");
    expect(items[0]).toMatchObject({ brainstormIdeaId: id, scheduledDate: "2026-11-26", format: "Reels" });
  });
});
