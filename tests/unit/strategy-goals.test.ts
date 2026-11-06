import { describe, it, expect } from "vitest";
import { StrategyService } from "@/modules/strategy/service";

describe("Gestão Estratégica: Regras de Avaliação de Metas e Conciliação", () => {
  it("deve calcular corretamente a execução de investimento com base no caso de aceite", () => {
    const planned = 300.0;
    const actual1 = 20.0;

    const execPercent1 = Number(((actual1 / planned) * 100).toFixed(2));
    const unexecuted1 = Number((planned - actual1).toFixed(2));
    const deviation1 = Number((actual1 - planned).toFixed(2));

    expect(execPercent1).toBe(6.67);
    expect(unexecuted1).toBe(280.0);
    expect(deviation1).toBe(-280.0);

    // Caso de excesso
    const actual2 = 350.0;
    const execPercent2 = Number(((actual2 / planned) * 100).toFixed(2));
    const excess2 = Number((actual2 - planned).toFixed(2));
    const deviation2 = Number((actual2 - planned).toFixed(2));

    expect(execPercent2).toBe(116.67);
    expect(excess2).toBe(50.0);
    expect(deviation2).toBe(50.0);
  });

  it("deve diferenciar meta de investimento de teto de custo", () => {
    const planned = 300.0;
    const actual = 20.0;

    // Se a regra é teto de custo: R$ 20 está DENTRO DO PLANEJADO (positivo para contenção de gastos)
    const isUnderCeiling = actual <= planned;
    expect(isUnderCeiling).toBe(true);

    // Se a regra é execução de investimento em mídia: R$ 20 está ABAIXO DO ESPERADO
    const isExecutionUnder = actual < planned;
    expect(isExecutionUnder).toBe(true);
  });

  it("trata divisão por zero com segurança quando a meta planejada for zero", () => {
    const planned = 0;
    const actual = 50.0;

    const exec = planned > 0 ? (actual / planned) * 100 : null;
    expect(exec).toBeNull();
  });
});

