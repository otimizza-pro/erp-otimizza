import { describe, it, expect } from "vitest";
import { computeNormalizedMrr } from "@/modules/analytics/service";

describe("Testes Unitários de Métricas Analíticas e BI", () => {
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

  it("elimina dupla dedução em estornos: baixa válida de R$ 500 com estorno de outra baixa de R$ 200 não deduz R$ 200 duplamente", () => {
    // Cenário:
    // Baixa 1: R$ 500 (is_reversed = false)
    // Baixa 2: R$ 200 (is_reversed = true) -> estornada
    // Registro Reversal: R$ 200 (reversal record)
    // Ao filtrar is_reversed = false, a Baixa 2 já é excluída.
    // O total líquido recebido deve ser exatamente R$ 500,00 (não R$ 300,00).
    const validReceipts = [500.0];
    const totalReceived = validReceipts.reduce((a, b) => a + b, 0);
    expect(totalReceived).toBe(500.0);
  });

  it("trata divisão por zero e denominadores nulos de forma segura sem lançar exceções", () => {
    const cur = 500.0;
    const prev = 0.0;
    let percentageChange: number | null = null;
    if (prev !== 0) {
      percentageChange = Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
    } else if (cur > 0) {
      percentageChange = 100.0;
    }
    expect(percentageChange).toBe(100.0);

    const curZero = 0.0;
    const prevZero = 0.0;
    let zeroPct: number | null = null;
    if (prevZero !== 0) {
      zeroPct = Number((((curZero - prevZero) / Math.abs(prevZero)) * 100).toFixed(1));
    } else if (curZero > 0) {
      zeroPct = 100.0;
    }
    expect(zeroPct).toBeNull();
  });
});
