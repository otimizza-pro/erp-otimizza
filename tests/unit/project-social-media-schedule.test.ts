import { describe, expect, it } from "vitest";
import { buildProjectPostTitle, nextProjectMonth, projectPostSlots, socialMediaScheduleSchema } from "@/modules/projects/social-media-schedule";
import { buildAutoOrganizedPostAssignments } from "@/modules/projects/social-media-planning";

describe("Planejamento mensal de social media", () => {
  it("gera a quantidade configurada nos dias da semana escolhidos, com datas e títulos padronizados", () => {
    expect(projectPostSlots("2027-01", { postsPerMonth: 4, weekdays: [1, 5] }, "Mix Alimentos")).toEqual([
      { date: "2027-01-01", title: "#01 Mix Alimentos | Post estático", number: 1 },
      { date: "2027-01-11", title: "#02 Mix Alimentos | Post estático", number: 2 },
      { date: "2027-01-18", title: "#03 Mix Alimentos | Post estático", number: 3 },
      { date: "2027-01-29", title: "#04 Mix Alimentos | Post estático", number: 4 },
    ]);
  });

  it("monta e atualiza título curto dinâmico #numero Cliente | Formato - Headline", () => {
    expect(
      buildProjectPostTitle({
        postNumber: 1,
        clientName: "Ramiele Souza",
        format: "Reels",
        headline: "03 exames fundamentais para seus rins",
      }),
    ).toBe("#01 Ramiele Souza | Reels - 03 exames fundamentais para seus rins");

    expect(
      buildProjectPostTitle({
        postNumber: 1,
        clientName: "Ramiele Souza",
        format: "Carrossel",
        headline: "03 exames fundamentais para seus rins",
      }),
    ).toBe("#01 Ramiele Souza | Carrossel - 03 exames fundamentais para seus rins");

    expect(
      buildProjectPostTitle({
        postNumber: 2,
        clientName: "Ramiele Souza",
        format: "Estático",
      }),
    ).toBe("#02 Ramiele Souza | Post estático");
  });

  it("avança o mês ao trocar de ano e inclui 29 de fevereiro em ano bissexto", () => {
    expect(nextProjectMonth("2026-12")).toBe("2027-01");
    expect(projectPostSlots("2028-02", { postsPerMonth: 5, weekdays: [2] }, "Otimizza").at(-1)?.date).toBe("2028-02-29");
  });

  it("recusa datas insuficientes e configuração com dias repetidos", () => {
    expect(() => projectPostSlots("2027-02", { postsPerMonth: 5, weekdays: [1] }, "Otimizza"))
      .toThrow("Este mês tem 4 datas");
    expect(socialMediaScheduleSchema.safeParse({ postsPerMonth: 4, weekdays: [1, 1] }).success).toBe(false);
  });

  it("permite e prioriza datas customizadas selecionadas manualmente no calendário", () => {
    const customSchedule = {
      postsPerMonth: 3,
      weekdays: [1, 3, 5],
      customDates: ["2027-01-05", "2027-01-12", "2027-01-20"],
    };
    expect(socialMediaScheduleSchema.safeParse(customSchedule).success).toBe(true);
    expect(projectPostSlots("2027-01", customSchedule, "Cliente X")).toEqual([
      { date: "2027-01-05", title: "#01 Cliente X | Post estático", number: 1 },
      { date: "2027-01-12", title: "#02 Cliente X | Post estático", number: 2 },
      { date: "2027-01-20", title: "#03 Cliente X | Post estático", number: 3 },
    ]);
  });

  it("distribui pilares, ofertas e formatos variados na organização automática", () => {
    const assignments = buildAutoOrganizedPostAssignments({
      postIds: ["p1", "p2", "p3", "p4"],
      editorialLines: [
        { id: "l1", pillarId: "pil1", pillarName: "Autoridade", theme: "Mitos", preferredFormats: ["Carrossel", "Reels"] },
        { id: "l2", pillarId: "pil2", pillarName: "Prova Social", theme: "Casos" },
      ],
      offers: [{ name: "Pilates" }, { name: "Fisioterapia" }],
    });

    expect(assignments).toEqual([
      { postId: "p1", editorialLineId: "l1", offerName: "Pilates", format: "Carrossel" },
      { postId: "p2", editorialLineId: "l2", offerName: "Fisioterapia", format: "Reels" },
      { postId: "p3", editorialLineId: "l1", offerName: "Institucional / Marca", format: "Carrossel" },
      { postId: "p4", editorialLineId: "l2", offerName: "Pilates", format: "Stories" },
    ]);
  });
});
