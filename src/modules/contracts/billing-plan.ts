import { z } from "zod";
import { toCents, fromCents } from "@/shared/money";

export type ServicePeriod = "MONTHLY" | "YEARLY" | "ONE_TIME";
export const periodLabels: Record<ServicePeriod, string> = { MONTHLY: "Mensal", YEARLY: "Anual", ONE_TIME: "Avulso" };
export function servicePeriod(unit?: string): ServicePeriod {
  return unit === "ANUAL" ? "YEARLY" : unit === "MES" ? "MONTHLY" : "ONE_TIME";
}
export function allocateTotal(total: number, weights: number[]): number[] {
  const cents = toCents(total);
  if (!Number.isSafeInteger(cents) || cents < 0 || !weights.length || weights.some(w => !Number.isFinite(w) || w < 0)) throw new Error("Valor de negociação inválido.");
  const integerWeights = weights.map(w => {
    const value = toCents(w);
    if (!Number.isSafeInteger(value)) throw new Error("Preço de referência inválido.");
    return BigInt(value);
  });
  const sum = integerWeights.reduce((a, b) => a + b, BigInt(0));
  let assigned = 0;
  let cumulative = BigInt(0);
  return integerWeights.map((w, i) => {
    cumulative += sum ? w : BigInt(1);
    const next = i === weights.length - 1 ? cents : Number(BigInt(cents) * cumulative / (sum || BigInt(weights.length)));
    const result = next - assigned;
    assigned = next;
    return fromCents(result);
  });
}
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}
const businessDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
}, "Data inválida");
export const BillingPlanSchema = z.object({
  groupSamePeriod: z.boolean().default(false),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    firstDueDate: businessDate,
    installments: z.number().int().min(1).max(3),
  })).min(1),
});
export type BillingPlanInput = z.infer<typeof BillingPlanSchema>;
export function installmentAmounts(amount: number, installments: number): number[] {
  if (![1, 2, 3].includes(installments)) throw new Error("Avulso permite até 3 parcelas.");
  const cents = toCents(amount);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Valor inválido.");
  // Round half up; any residual cent belongs to the final installment.
  const base = Math.round(cents / installments);
  return Array.from({ length: installments }, (_, index) =>
    fromCents(index === installments - 1 ? cents - base * (installments - 1) : base)
  );
}
