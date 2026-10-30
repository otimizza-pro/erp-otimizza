/**
 * Utilitários de Precisão Financeira
 * O Sistema ERP trabalha com valores monetários representados em centavos inteiros (integers)
 * na camada de regras de negócio, eliminando qualquer imprecisão de ponto flutuante IEEE 754.
 */

export function toCents(amount: number | string): number {
  if (typeof amount === "string") {
    const trimmed = amount.trim();
    if (!trimmed) return 0;

    let normalized: string;
    if (trimmed.includes(",")) {
      // Formato brasileiro: 1.234,56 ou 10,55
      normalized = trimmed.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato padrão ISO: 10.55 ou 1234
      normalized = trimmed;
    }

    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatBRL(cents: number): string {
  const value = fromCents(cents);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata um valor numérico em reais (ex: 1500.50 -> "R$ 1.500,50")
 */
export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "R$ 0,00";
  const num = typeof amount === "number" ? amount : parseMoney(amount);
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Converte qualquer representação em string/número para float limpo
 */
export function parseMoney(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  const cleaned = str.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  let normalized: string;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned;
  }
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Divide um valor total em N parcelas exatas em centavos.
 * Eventuais centavos residuais gerados pela divisão não-exata são distribuídos
 * deterministicamente na primeira parcela, garantindo que a soma seja 100% idêntica ao total.
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (count <= 0) throw new Error("A quantidade de parcelas deve ser maior que zero.");
  if (totalCents < 0) throw new Error("O valor total não pode ser negativo.");

  const baseAmount = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  const installments: number[] = [];
  for (let i = 0; i < count; i++) {
    // O resto da divisão de centavos é somado nas primeiras parcelas
    installments.push(baseAmount + (i < remainder ? 1 : 0));
  }

  return installments;
}

/**
 * Calcula o saldo remanescente de um título após liquidações.
 */
export function calculateRemaining(originalCents: number, paidCents: number): number {
  const remaining = originalCents - paidCents;
  return remaining > 0 ? remaining : 0;
}
