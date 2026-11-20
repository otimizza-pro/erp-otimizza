import { describe, expect, it } from "vitest";
import { nextProjectMonth, projectPostSlots, socialMediaScheduleSchema } from "@/modules/projects/social-media-schedule";

describe("Planejamento mensal de social media", () => {
  it("gera a quantidade configurada nos dias da semana escolhidos, com datas e títulos estáveis", () => {
    expect(projectPostSlots("2027-01", { postsPerMonth: 4, weekdays: [1, 5] }, "Mix Alimentos")).toEqual([
      { date: "2027-01-01", title: "Post Mix Alimentos Jan #01", number: 1 },
      { date: "2027-01-11", title: "Post Mix Alimentos Jan #02", number: 2 },
      { date: "2027-01-18", title: "Post Mix Alimentos Jan #03", number: 3 },
      { date: "2027-01-29", title: "Post Mix Alimentos Jan #04", number: 4 },
    ]);
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
});
