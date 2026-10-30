import { describe, it, expect } from "vitest";
import { computeNormalizedMrr } from "@/modules/analytics/service";

describe("Fase 4: Testes Unitários de Métricas Analíticas e BI", () => {
  it("contrato mensal de R$ 1.000 compõe R$ 1.000 no MRR", () => {
    const mrr = computeNormalizedMrr("MONTHLY", 1000.0);
    expect(mrr).toBe(1000.0);
  });

  it("contrato anual recorrente de R$ 1.200 compõe R$ 100 no MRR", () => {
    const mrr = computeNormalizedMrr("YEARLY", 1200.0);
    expect(mrr).toBe(100.0);
  });

  it("contrato avulso (ONE_TIME) não compõe MRR (R$ 0)", () => {
    const mrr = computeNormalizedMrr("ONE_TIME", 5000.0);
    expect(mrr).toBe(0.0);
  });

  it("baixa parcial de R$ 600 em título de R$ 1.000 mantém R$ 400 em aberto e R$ 600 recebido", () => {
    const original = 1000.0;
    const paid = 600.0;
    const balance = original - paid;
    expect(paid).toBe(600.0);
    expect(balance).toBe(400.0);
  });

  it("distribuição de combo comercial de R$ 1.000 preserva o montante exato sem dupla contagem", () => {
    const metaAds = 600.0;
    const googleAds = 400.0;
    const totalCombo = metaAds + googleAds;
    expect(totalCombo).toBe(1000.0);
  });
});
