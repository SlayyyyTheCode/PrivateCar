import { describe, expect, it } from 'vitest';
import { maxLtv, minDownPaymentPct, computeLoan, effectiveInterestRate } from '../../src/core/loan';

describe('maxLtv / minDownPaymentPct — MAS Notice 642', () => {
  it('allows a 70% loan when OMV is at or below $20,000', () => {
    expect(maxLtv(15_000)).toBe(0.7);
    expect(maxLtv(20_000)).toBe(0.7);
    expect(minDownPaymentPct(20_000)).toBeCloseTo(0.3);
  });

  it('drops to a 60% loan once OMV exceeds $20,000', () => {
    expect(maxLtv(20_001)).toBe(0.6);
    expect(maxLtv(45_000)).toBe(0.6);
    expect(minDownPaymentPct(45_000)).toBeCloseTo(0.4);
  });
});

describe('computeLoan — flat rate maths', () => {
  const base = { price: 100_000, omv: 15_000, downPaymentPct: 0.3, tenureYears: 5, flatRatePct: 2.8 };

  it('matches the SingSaver worked example', () => {
    // $100,000 principal at 2.8% flat over 5 years = $14,000 interest, $1,900/month
    const result = computeLoan({ ...base, price: 142_857.14, downPaymentPct: 0.3 });
    expect(result.principal).toBeCloseTo(100_000, 0);
    expect(result.totalInterest).toBeCloseTo(14_000, 0);
    expect(result.monthlyInstalment).toBeCloseTo(1_900, 0);
  });

  it('derives the down payment and principal from the price', () => {
    const result = computeLoan(base);
    expect(result.downPayment).toBe(30_000);
    expect(result.principal).toBe(70_000);
  });

  it('scales interest linearly with tenure, which is why long flat-rate loans hurt', () => {
    const four = computeLoan({ ...base, tenureYears: 4 });
    const seven = computeLoan({ ...base, tenureYears: 7 });
    expect(seven.totalInterest / four.totalInterest).toBeCloseTo(1.75, 6);
  });
});

describe('computeLoan — regulatory violations', () => {
  it('flags a down payment below the LTV floor', () => {
    const result = computeLoan({
      price: 180_000,
      omv: 30_000,
      downPaymentPct: 0.2,
      tenureYears: 5,
      flatRatePct: 2.88,
    });
    expect(result.violations.map((v) => v.rule)).toContain('ltv');
    expect(result.violations[0].message).toMatch(/40%/);
  });

  it('accepts exactly the minimum down payment', () => {
    const result = computeLoan({
      price: 180_000,
      omv: 30_000,
      downPaymentPct: 0.4,
      tenureYears: 5,
      flatRatePct: 2.88,
    });
    expect(result.violations).toHaveLength(0);
  });

  it('flags a tenure beyond seven years', () => {
    const result = computeLoan({
      price: 180_000,
      omv: 30_000,
      downPaymentPct: 0.4,
      tenureYears: 8,
      flatRatePct: 2.88,
    });
    expect(result.violations.map((v) => v.rule)).toContain('tenure');
  });
});

describe('effectiveInterestRate', () => {
  it('reveals that a 2.8% flat rate is roughly double in real terms', () => {
    const eir = effectiveInterestRate(100_000, 1_900, 60);
    expect(eir).toBeGreaterThan(5.0);
    expect(eir).toBeLessThan(5.6);
  });

  it('is reported on the loan result', () => {
    const result = computeLoan({
      price: 142_857.14,
      omv: 30_000,
      downPaymentPct: 0.3,
      tenureYears: 5,
      flatRatePct: 2.8,
    });
    expect(result.effectiveRatePct).toBeGreaterThan(result.flatRatePct);
  });

  it('returns zero for an interest-free loan', () => {
    expect(effectiveInterestRate(12_000, 1_000, 12)).toBeCloseTo(0, 4);
  });
});
