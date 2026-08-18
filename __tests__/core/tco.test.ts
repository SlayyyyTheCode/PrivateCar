import { describe, expect, it } from 'vitest';
import { computeTco, coeRebate, parfRebate } from '../../src/core/tco';
import { createDefaultScenario } from '../../src/core/defaults';

describe('parfRebate', () => {
  it('pays 30% of ARF under the Budget 2026 schedule for a young car', () => {
    expect(parfRebate(34_000, 4, 'from2026')).toBeCloseTo(10_200, 6);
  });

  it('pays 75% of ARF under the legacy schedule for the same car', () => {
    expect(parfRebate(34_000, 4, 'legacy')).toBeCloseTo(25_500, 6);
  });

  it('decays to 5% in the final COE year under the new schedule', () => {
    expect(parfRebate(34_000, 10, 'from2026')).toBeCloseTo(1_700, 6);
  });

  it('applies the $30,000 cap for cars registered from Feb 2026', () => {
    expect(parfRebate(200_000, 3, 'from2026')).toBe(30_000);
  });

  it('applies the $60,000 cap under the legacy schedule', () => {
    expect(parfRebate(200_000, 3, 'legacy')).toBe(60_000);
  });

  it('pays nothing once the car passes ten years', () => {
    expect(parfRebate(34_000, 10.5, 'from2026')).toBe(0);
    expect(parfRebate(34_000, 12, 'legacy')).toBe(0);
  });
});

describe('coeRebate', () => {
  it('is pro-rata on the unused months', () => {
    expect(coeRebate(120_000, 60)).toBe(60_000);
    expect(coeRebate(120_000, 30)).toBe(30_000);
  });

  it('is nothing once the COE has run out', () => {
    expect(coeRebate(120_000, 0)).toBe(0);
    expect(coeRebate(120_000, -5)).toBe(0);
  });
});

describe('computeTco — holding a new car to COE expiry', () => {
  const scenario = createDefaultScenario({
    car: { ...createDefaultScenario().car, totalPrice: 180_000, omv: 30_000, engineCc: 1_600 },
    loan: { downPaymentPct: 0.4, tenureYears: 5, flatRatePct: 2.88 },
  });
  const result = computeTco(scenario);

  it('runs for the full 120 months of the COE', () => {
    expect(result.holdingMonths).toBe(120);
    expect(result.holdingYears).toBe(10);
  });

  it('charges instalments only for the loan term, not the whole ten years', () => {
    const instalments = result.outflows.find((l) => l.label === 'Loan instalments paid')!;
    expect(instalments.amount).toBeCloseTo(123_552, 2); // 108,000 + 15,552 interest
    expect(result.outflows.find((l) => l.label === 'Loan still owing at sale')!.amount).toBeCloseTo(0, 6);
  });

  it('gets no COE rebate, because the COE was used up', () => {
    expect(result.coeRebate).toBe(0);
  });

  it('gets only the final-year PARF rebate', () => {
    // ARF on a $30,000 OMV is $34,000; 5% of that at year 10
    expect(result.arf).toBe(34_000);
    expect(result.parfRebate).toBeCloseTo(1_700, 6);
  });

  it('nets out to a true cost far above the sticker price', () => {
    const runningTotal = (900 + 743 / 12) * 120;
    const expectedGross = 72_000 + 123_552 + runningTotal;
    expect(result.grossOutlay).toBeCloseTo(expectedGross, 2);
    expect(result.netCost).toBeCloseTo(expectedGross - 1_700, 2);
    expect(result.effectiveMonthlyCost).toBeCloseTo((expectedGross - 1_700) / 120, 2);
  });

  it('reports annual depreciation against the price paid', () => {
    expect(result.annualDepreciation).toBeCloseTo((180_000 - 1_700) / 10, 2);
  });
});

describe('computeTco — selling early', () => {
  const scenario = createDefaultScenario({
    car: { ...createDefaultScenario().car, totalPrice: 180_000, omv: 30_000, engineCc: 1_600 },
    loan: { downPaymentPct: 0.4, tenureYears: 5, flatRatePct: 2.88 },
  });

  it('returns both rebates when sold at year 4', () => {
    const result = computeTco(scenario, 48);
    expect(result.parfRebate).toBeCloseTo(34_000 * 0.3, 6);
    expect(result.coeRebate).toBeCloseTo((123_890 * 72) / 120, 6);
  });

  it('still counts the loan balance outstanding at the point of sale', () => {
    const result = computeTco(scenario, 48);
    const owing = result.outflows.find((l) => l.label === 'Loan still owing at sale')!;
    expect(owing.amount).toBeCloseTo(123_552 - 2_059.2 * 48, 2);
    expect(owing.amount).toBeGreaterThan(0);
  });

  it('is cheaper per month to sell early under the legacy PARF schedule', () => {
    const legacy = computeTco({ ...scenario, car: { ...scenario.car, parfScheme: 'legacy' } }, 48);
    const modern = computeTco(scenario, 48);
    expect(legacy.effectiveMonthlyCost).toBeLessThan(modern.effectiveMonthlyCost);
  });
});
