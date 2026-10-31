import { describe, it, expect } from "vitest";
import {
  CostCenterInputSchema,
  PayableAllocationsInputSchema,
  DREPeriodStatement,
} from "../../src/modules/financial/dre/types";
import { exportDREStatementToCSV } from "../../src/modules/financial/dre/service";

describe("Fase 10 - DRE Gerencial e Centros de Custo (Testes Unitários)", () => {
  it("deve validar schema de centro de custo com conversão para maiúsculas e validação de tamanho", () => {
    const valid = CostCenterInputSchema.parse({
      code: "mkt",
      name: "Marketing e Growth",
      description: "Despesas de mídia e publicidade",
    });

    expect(valid.code).toBe("MKT");
    expect(valid.name).toBe("Marketing e Growth");

    expect(() =>
      CostCenterInputSchema.parse({
        code: "X", // menor que 2 caracteres
        name: "A",
      })
    ).toThrow();
  });

  it("deve validar schema de rateio de centros de custo", () => {
    const valid = PayableAllocationsInputSchema.parse({
      payableId: "11111111-1111-1111-1111-111111111111",
      allocations: [
        {
          costCenterId: "22222222-2222-2222-2222-222222222222",
          percentage: 30,
          amount: 300.0,
        },
        {
          costCenterId: "33333333-3333-3333-3333-333333333333",
          percentage: 70,
          amount: 700.0,
        },
      ],
    });

    expect(valid.allocations).toHaveLength(2);
    expect(valid.allocations[0].percentage).toBe(30);
    expect(valid.allocations[1].amount).toBe(700.0);
  });

  it("deve rejeitar rateio com percentual maior que 100% ou valor negativo", () => {
    expect(() =>
      PayableAllocationsInputSchema.parse({
        payableId: "11111111-1111-1111-1111-111111111111",
        allocations: [
          {
            costCenterId: "22222222-2222-2222-2222-222222222222",
            percentage: 150, // inválido
            amount: 500,
          },
        ],
      })
    ).toThrow();

    expect(() =>
      PayableAllocationsInputSchema.parse({
        payableId: "11111111-1111-1111-1111-111111111111",
        allocations: [
          {
            costCenterId: "22222222-2222-2222-2222-222222222222",
            percentage: 50,
            amount: -100, // inválido
          },
        ],
      })
    ).toThrow();
  });

  it("deve formatar exportação CSV da DRE com todas as seções e lançamentos não classificados", () => {
    const sampleStmt: DREPeriodStatement = {
      periodKey: "2026-10",
      accountingMethod: "ACCRUAL",
      costCenterId: null,
      costCenterName: null,
      grossRevenue: 10000.0,
      grossRevenueItems: [
        {
          id: "1",
          code: "1.01",
          name: "Receita de Prestação de Serviços",
          amount: 10000.0,
          percentageOfRevenue: 100,
        },
      ],
      deductions: 600.0,
      deductionItems: [
        {
          id: "2",
          code: "2.01",
          name: "Impostos Diretos e Deduções",
          amount: 600.0,
          percentageOfRevenue: 6,
        },
      ],
      netRevenue: 9400.0,
      directCosts: 2400.0,
      directCostItems: [
        {
          id: "3",
          code: "3.01",
          name: "Custos Fornecedores",
          amount: 2400.0,
          percentageOfRevenue: 25.53,
        },
      ],
      contributionMargin: 7000.0,
      contributionMarginPercentage: 74.47,
      operationalExpenses: 3000.0,
      operationalExpenseItems: {
        administrative: 1000.0,
        commercial: 1200.0,
        technology: 800.0,
        other: 0,
        lines: [],
      },
      operationalResult: 4000.0,
      operationalResultPercentage: 42.55,
      nonOperationalResult: 0,
      nonOperationalItems: [],
      netManagerialResult: 4000.0,
      netManagerialResultPercentage: 42.55,
      unclassified: {
        total: 500.0,
        count: 1,
        items: [
          {
            id: "p1",
            description: "PAG-00099 - Despesa Diversa Sem Categoria",
            amount: 500.0,
            date: "2026-10-15",
            source: "PAYABLE",
          },
        ],
      },
      reconciliationKpis: {
        projectedRevenue: 12000.0,
        contractedRevenue: 10000.0,
        invoicedRevenue: 10000.0,
        receivedCash: 8000.0,
        recognizedRevenue: 10000.0,
        projectedExpenses: 5400.0,
        incurredExpenses: 5400.0,
        paidCash: 4500.0,
        appropriatedCost: 2400.0,
      },
    };

    const csv = exportDREStatementToCSV(sampleStmt);

    expect(csv).toContain("DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE GERENCIAL)");
    expect(csv).toContain("2026-10");
    expect(csv).toContain("Receita Líquida;9400.00");
    expect(csv).toContain("Margem de Contribuição;7000.00");
    expect(csv).toContain("Resultado Operacional Gerencial;4000.00");
    expect(csv).toContain("AVISO: LANÇAMENTOS NÃO CLASSIFICADOS");
    expect(csv).toContain("Valor Total Pendente;500.00");
  });
});
