import { describe, it, expect } from "vitest";
import { getContractProjections } from "@/modules/contracts/service";
import { ContractRecord } from "@/modules/contracts/types";
import { calculateEffectiveDueDate, generateBillingPeriodKey } from "@/shared/recurrence";

describe("Regras Unitárias de Contratações, Versões e Recorrência", () => {
  it("calcula ajuste de dia de vencimento para anos bissextos e meses curtos", () => {
    // 2028 é bissexto -> 29 dias em fevereiro
    expect(calculateEffectiveDueDate(31, 2028, 2)).toBe("2028-02-29");
    // 2027 não é bissexto -> 28 dias em fevereiro
    expect(calculateEffectiveDueDate(31, 2027, 2)).toBe("2027-02-28");
    // Abril tem 30 dias
    expect(calculateEffectiveDueDate(31, 2026, 4)).toBe("2026-04-30");
    // Dia 15 se mantém 15 em qualquer mês
    expect(calculateEffectiveDueDate(15, 2026, 2)).toBe("2026-02-15");
  });

  it("gera chave canônica unívoca por contratação e competência", () => {
    const key1 = generateBillingPeriodKey("ctr-100", 2026, 5);
    const key2 = generateBillingPeriodKey("ctr-100", 2026, 5);
    const keyDiff = generateBillingPeriodKey("ctr-100", 2026, 6);

    expect(key1).toBe("ctr-100_2026-05");
    expect(key1).toBe(key2); // Idempotência
    expect(key1).not.toBe(keyDiff);
  });

  it("calcula projeção financeira utilizando versões com vigência explícita", () => {
    const contract: ContractRecord = {
      id: "test-contract-1",
      clientId: "client-1",
      contractNumber: "CTR-00001",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      currentVersion: {
        id: "v2",
        contractId: "test-contract-1",
        versionNumber: 2,
        title: "Revisão com Aumento",
        billingPeriod: "MONTHLY",
        dueDay: 10,
        startDate: "2026-01-01",
        isIndefinite: true,
        effectiveDate: "2026-04-01",
        totalAmount: 1500.0,
        createdAt: "2026-03-25T00:00:00.000Z",
      },
      versions: [
        {
          id: "v1",
          contractId: "test-contract-1",
          versionNumber: 1,
          title: "Contrato Inicial",
          billingPeriod: "MONTHLY",
          dueDay: 10,
          startDate: "2026-01-01",
          isIndefinite: true,
          effectiveDate: "2026-01-01",
          totalAmount: 1000.0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "v2",
          contractId: "test-contract-1",
          versionNumber: 2,
          title: "Revisão com Aumento",
          billingPeriod: "MONTHLY",
          dueDay: 10,
          startDate: "2026-01-01",
          isIndefinite: true,
          effectiveDate: "2026-04-01",
          totalAmount: 1500.0,
          createdAt: "2026-03-25T00:00:00.000Z",
        },
      ],
    };

    const projections = getContractProjections(contract, { year: 2026, month: 1 }, 6);
    expect(projections.length).toBe(6);

    // Janeiro (2026-01), Fevereiro (2026-02), Março (2026-03) devem usar versão 1 (R$ 1.000)
    expect(projections[0].competency).toBe("2026-01");
    expect(projections[0].amount).toBe(1000.0);
    expect(projections[0].versionNumber).toBe(1);

    expect(projections[1].competency).toBe("2026-02");
    expect(projections[1].amount).toBe(1000.0);
    expect(projections[1].versionNumber).toBe(1);

    expect(projections[2].competency).toBe("2026-03");
    expect(projections[2].amount).toBe(1000.0);
    expect(projections[2].versionNumber).toBe(1);

    // A partir de Abril (2026-04), deve usar versão 2 (R$ 1.500)
    expect(projections[3].competency).toBe("2026-04");
    expect(projections[3].amount).toBe(1500.0);
    expect(projections[3].versionNumber).toBe(2);

    expect(projections[4].competency).toBe("2026-05");
    expect(projections[4].amount).toBe(1500.0);
    expect(projections[4].versionNumber).toBe(2);
  });

  it("marca competências após cancelamento como isPastOrCanceled", () => {
    const contract: ContractRecord = {
      id: "test-contract-canceled",
      clientId: "client-1",
      contractNumber: "CTR-00002",
      status: "CANCELED",
      cancellationReason: "Rescisão acordada",
      canceledAt: "2026-03-15T12:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-03-15T12:00:00.000Z",
      currentVersion: {
        id: "v1",
        contractId: "test-contract-canceled",
        versionNumber: 1,
        title: "Contrato Cancelado",
        billingPeriod: "MONTHLY",
        dueDay: 5,
        startDate: "2026-01-01",
        isIndefinite: true,
        effectiveDate: "2026-01-01",
        totalAmount: 2000.0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    };

    const projections = getContractProjections(contract, { year: 2026, month: 1 }, 5);
    // Janeiro (2026-01) e Fevereiro (2026-02) são anteriores ao cancelamento -> false
    expect(projections[0].isPastOrCanceled).toBe(false);
    expect(projections[1].isPastOrCanceled).toBe(false);
    // Abril (2026-04) e Maio (2026-05) são posteriores ao cancelamento de Março -> true
    expect(projections[3].isPastOrCanceled).toBe(true);
    expect(projections[4].isPastOrCanceled).toBe(true);
  });
});
