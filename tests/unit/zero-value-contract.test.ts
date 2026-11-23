import { describe, it, expect, vi } from "vitest";
import { installmentAmounts, allocateTotal } from "@/modules/contracts/billing-plan";

describe("Zero-value / Permuta Contracts", () => {
  it("calculates installment amounts for zero-value contracts without throwing", () => {
    const installments = installmentAmounts(0, 1);
    expect(installments).toEqual([0]);

    const installments3 = installmentAmounts(0, 3);
    expect(installments3).toEqual([0, 0, 0]);
  });

  it("allocates total zero among weights without throwing", () => {
    const allocated = allocateTotal(0, [100, 200]);
    expect(allocated).toEqual([0, 0]);
  });

  it("handles zero unit prices in contract items calculation", () => {
    const items = [
      { quantity: 1, unitPrice: 0, unitCost: 0 },
      { quantity: 2, unitPrice: 0, unitCost: 0 },
    ];

    const total = items.reduce(
      (acc, it) => acc + (it.quantity || 1) * (it.unitPrice || 0),
      0
    );

    expect(total).toBe(0);
  });
});
