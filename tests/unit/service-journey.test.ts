import { describe, it, expect } from "vitest";
import { allocateTotal, installmentAmounts, addMonths, servicePeriod, BillingPlanSchema } from "@/modules/contracts/billing-plan";
describe("Negociação e calendário de serviços", () => {
  it("rateia o total de um combo sem perder centavos", () => {
    const amounts = allocateTotal(900, [60, 275, 650]);
    expect(amounts.map(n => Math.round(n * 100)).reduce((a, b) => a + b, 0)).toBe(90000);
    expect(amounts.every(n => n >= 0)).toBe(true);
  });
  it("parcela R$ 650 em 3x com soma exata", () => {
    expect(installmentAmounts(650, 3)).toEqual([216.66, 216.67, 216.67]);
    expect(() => installmentAmounts(650, 4)).toThrow();
  });
  it("trata referências gratuitas e um centavo sem valores negativos", () => {
    expect(allocateTotal(0.01, [1, 1, 1])).toEqual([0, 0, 0.01]);
    expect(allocateTotal(1, [0, 0])).toEqual([0.5, 0.5]);
    expect(() => allocateTotal(-1, [1])).toThrow();
  });
  it("preserva o dia 31 após fevereiro e aniversário de ano bissexto", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2027-01-31", 2)).toBe("2027-03-31");
    expect(addMonths("2028-02-29", 12)).toBe("2029-02-28");
  });
  it("rejeita datas inexistentes e reconhece periodicidades do catálogo", () => {
    expect(BillingPlanSchema.safeParse({ items: [{ itemId: "11111111-1111-4111-8111-111111111111", firstDueDate: "2027-02-30", installments: 1 }] }).success).toBe(false);
    expect([servicePeriod("ANUAL"), servicePeriod("MES"), servicePeriod("PROJETO")]).toEqual(["YEARLY", "MONTHLY", "ONE_TIME"]);
  });
});
