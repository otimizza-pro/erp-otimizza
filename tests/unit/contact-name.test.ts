import { describe, it, expect } from "vitest";
import { formatContactFirstName } from "../../src/modules/clients/contact-name";

describe("formatContactFirstName", () => {
  it("extrai apenas o primeiro nome para pessoas comuns", () => {
    expect(formatContactFirstName("Rondinelle Guedes")).toBe("Rondinelle");
    expect(formatContactFirstName("Maria Clara Santos")).toBe("Maria");
    expect(formatContactFirstName("João")).toBe("João");
  });

  it("preserva títulos como Dr, Dr., Dra, Dra., Drª, Prof etc. + primeiro nome", () => {
    expect(formatContactFirstName("Dr. Rondinelle Guedes")).toBe("Dr. Rondinelle");
    expect(formatContactFirstName("Dr Rondinelle")).toBe("Dr Rondinelle");
    expect(formatContactFirstName("Dra. Camila Santos")).toBe("Dra. Camila");
    expect(formatContactFirstName("Drª Juliana")).toBe("Drª Juliana");
    expect(formatContactFirstName("Prof. Carlos Silva")).toBe("Prof. Carlos");
    expect(formatContactFirstName("Doutor Lucas")).toBe("Doutor Lucas");
    expect(formatContactFirstName("Doutora Patricia")).toBe("Doutora Patricia");
  });

  it("evita usar o nome da empresa quando for idêntico", () => {
    expect(formatContactFirstName("Studio TRG", "Studio TRG")).toBe("Parceiro");
    expect(formatContactFirstName(null)).toBe("Parceiro");
    expect(formatContactFirstName("")).toBe("Parceiro");
  });
});
