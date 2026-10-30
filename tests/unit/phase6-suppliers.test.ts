import { describe, it, expect } from "vitest";
import { CreateSupplierSchema, CreateAllocationSchema } from "@/modules/suppliers/types";

describe("Fase 6: Validações Unitárias de Fornecedores e Rateios", () => {
  it("valida cadastro de fornecedor PJ com dados válidos", () => {
    const validPj = {
      personType: "PJ" as const,
      name: "Cloud Hosting Soluções LTDA",
      tradeName: "CloudHost",
      document: "12.345.678/0001-90",
      email: "financeiro@cloudhost.com.br",
      category: "Infraestrutura & Cloud",
    };

    const parsed = CreateSupplierSchema.parse(validPj);
    expect(parsed.name).toBe("Cloud Hosting Soluções LTDA");
    expect(parsed.personType).toBe("PJ");
  });

  it("valida cadastro de fornecedor PF com documento opcional", () => {
    const validPf = {
      personType: "PF" as const,
      name: "Dr. Roberto Martins",
      email: "roberto@consultoria.com",
      category: "Jurídico & Contábil",
    };

    const parsed = CreateSupplierSchema.parse(validPf);
    expect(parsed.name).toBe("Dr. Roberto Martins");
    expect(parsed.document).toBeUndefined();
  });

  it("rejeita fornecedor sem nome ou com nome muito curto", () => {
    expect(() => {
      CreateSupplierSchema.parse({
        personType: "PJ",
        name: "A",
      });
    }).toThrow();
  });

  it("rejeita rateio com valor menor ou igual a zero", () => {
    expect(() => {
      CreateAllocationSchema.parse({
        payableId: "00000000-0000-0000-0000-000000000001",
        allocatedAmount: 0,
        coverageStartDate: "2026-01-01",
        coverageEndDate: "2026-12-31",
      });
    }).toThrow();
  });

  it("rejeita rateio com data de término anterior à data de início", () => {
    expect(() => {
      CreateAllocationSchema.parse({
        payableId: "00000000-0000-0000-0000-000000000001",
        allocatedAmount: 1000,
        coverageStartDate: "2026-12-31",
        coverageEndDate: "2026-01-01",
      });
    }).toThrow();
  });

  it("calcula divisão exata em centavos para apropriação anual sem perda residual", () => {
    // R$ 100,00 dividido em 3 meses
    const totalCents = 10000;
    const monthsCount = 3;
    const baseCents = Math.floor(totalCents / monthsCount); // 3333 centavos = 33.33
    const remainderCents = totalCents - baseCents * monthsCount; // 1 centavo

    const monthlyAllocations: number[] = [];
    for (let i = 0; i < monthsCount; i++) {
      const monthCents = i === monthsCount - 1 ? baseCents + remainderCents : baseCents;
      monthlyAllocations.push(monthCents / 100);
    }

    expect(monthlyAllocations).toEqual([33.33, 33.33, 33.34]);
    const sum = monthlyAllocations.reduce((acc, v) => acc + v, 0);
    expect(sum).toBe(100.00);
  });

  it("calcula divisão de R$ 480,00 anuais em 12 parcelas mensais de R$ 40,00 exatos", () => {
    const totalCents = 48000;
    const monthsCount = 12;
    const baseCents = Math.floor(totalCents / monthsCount);
    const remainderCents = totalCents - baseCents * monthsCount;

    expect(remainderCents).toBe(0);
    expect(baseCents / 100).toBe(40.00);
  });
});
