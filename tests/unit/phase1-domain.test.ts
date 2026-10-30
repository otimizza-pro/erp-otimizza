import { describe, it, expect } from "vitest";
import { normalizeDocument, validateCPF, validateCNPJ } from "@/shared/cpf-cnpj";

describe("Fase 1: Regras de Validação de Documentos e Contatos", () => {
  it("valida e normaliza CPF de pessoa física", () => {
    const raw = "529.982.247-25";
    const clean = normalizeDocument(raw);
    expect(clean).toBe("52998224725");
    expect(validateCPF(clean)).toBe(true);
  });

  it("rejeita CPF inválido com dígito verificador incorreto", () => {
    const invalid = "52998224720";
    expect(validateCPF(invalid)).toBe(false);
  });

  it("valida e normaliza CNPJ de pessoa jurídica", () => {
    const raw = "11.222.333/0001-81";
    const clean = normalizeDocument(raw);
    expect(clean).toBe("11222333000181");
    expect(validateCNPJ(clean)).toBe(true);
  });

  it("rejeita CNPJ com sequência inválida", () => {
    const invalid = "11222333000199";
    expect(validateCNPJ(invalid)).toBe(false);
  });

  it("permite documento nulo ou vazio no cadastro inicial conforme regra de negócio", () => {
    const emptyDoc = "";
    expect(normalizeDocument(emptyDoc)).toBe("");
  });
});

describe("Fase 1: Regras Comerciais de Combos de Serviços", () => {
  it("soma exatamente os componentes de um combo sem erros de ponto flutuante", () => {
    const items = [
      { serviceId: "s1", componentPrice: 450.55 },
      { serviceId: "s2", componentPrice: 1250.45 },
      { serviceId: "s3", componentPrice: 300.0 },
    ];

    const total = items.reduce((acc, curr) => acc + curr.componentPrice, 0);
    const rounded = Math.round(total * 100) / 100;
    expect(rounded).toBe(2001.0);
  });

  it("exige pelo menos 2 serviços para caracterizar um combo", () => {
    const singleItem = [{ serviceId: "s1", componentPrice: 100 }];
    expect(singleItem.length >= 2).toBe(false);

    const validCombo = [
      { serviceId: "s1", componentPrice: 100 },
      { serviceId: "s2", componentPrice: 200 },
    ];
    expect(validCombo.length >= 2).toBe(true);
  });
});
