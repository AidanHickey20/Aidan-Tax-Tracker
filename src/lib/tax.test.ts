import { describe, it, expect } from "vitest";
import { estimateTax } from "@/lib/tax";

describe("estimateTax", () => {
  it("returns 0 for zero or negative SE income with no other income", () => {
    expect(estimateTax(0)).toBe(0);
    expect(estimateTax(-5000)).toBe(0);
    expect(estimateTax(0, {})).toBe(0);
  });

  it("matches a hand-computed liability for $100k SE income (single, default rates)", () => {
    // SE tax 14,129.55 + fed 7,505.75 + state 2,552.73 + municipal 2,000
    expect(estimateTax(100_000)).toBeCloseTo(26_188.03, 0);
  });

  it("is monotonic — more income means more tax", () => {
    expect(estimateTax(100_000)).toBeGreaterThan(estimateTax(50_000));
    expect(estimateTax(250_000)).toBeGreaterThan(estimateTax(100_000));
  });

  it("keeps the effective rate within a sane band", () => {
    const rate = estimateTax(120_000) / 120_000;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.45);
  });

  it("taxes married-joint no more than single at the same income", () => {
    const income = 120_000;
    expect(estimateTax(income, { filingStatus: "MARRIED_JOINT" })).toBeLessThanOrEqual(
      estimateTax(income, { filingStatus: "SINGLE" })
    );
  });

  it("raises the SE tax when W-2 income stacks it into higher brackets", () => {
    const base = estimateTax(50_000);
    const withW2 = estimateTax(50_000, { additionalW2Income: 150_000 });
    expect(withW2).toBeGreaterThan(base);
  });

  it("respects custom state and municipal rates", () => {
    const noLocal = estimateTax(80_000, { stateTaxRate: 0, municipalTaxRate: 0 });
    const withLocal = estimateTax(80_000, { stateTaxRate: 0.05, municipalTaxRate: 0.025 });
    expect(withLocal).toBeGreaterThan(noLocal);
  });
});
