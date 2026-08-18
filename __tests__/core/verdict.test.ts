import { describe, expect, it } from 'vitest';
import { evaluateScenario } from '../../src/core/verdict';
import { createDefaultScenario } from '../../src/core/defaults';
import type { Scenario } from '../../src/core/types';

/** The scenario from the project's end-to-end verification case. */
function baseScenario(): Scenario {
  const s = createDefaultScenario();
  return {
    ...s,
    income: { ...s.income, grossMonthlyIncome: 8_000 },
    car: { ...s.car, totalPrice: 180_000, omv: 30_000, engineCc: 1_600 },
    loan: { downPaymentPct: 0.4, tenureYears: 5, flatRatePct: 2.88 },
  };
}

describe('evaluateScenario — the headline case', () => {
  const result = evaluateScenario(baseScenario());

  it('computes the monthly instalment from the flat rate', () => {
    // principal 108,000; interest 108,000 * 2.88% * 5 = 15,552; / 60 months
    expect(result.loan.principal).toBe(108_000);
    expect(result.loan.monthlyInstalment).toBeCloseTo(2_059.2, 2);
  });

  it('adds running costs to reach the true monthly cost of the car', () => {
    expect(result.totalMonthlyCarCost).toBeCloseTo(2_059.2 + 900 + 743 / 12, 2);
  });

  it('fails 20-4-10 overall', () => {
    const rule = result.rules.find((r) => r.id === 'rule-20-4-10')!;
    expect(rule.status).toBe('FAIL');
    expect(rule.legs.find((l) => l.id === 'tenure')!.pass).toBe(false);
    expect(rule.legs.find((l) => l.id === 'income')!.pass).toBe(false);
  });

  it('over-satisfies the 20% down leg, because Singapore law demands 40% anyway', () => {
    const rule = result.rules.find((r) => r.id === 'rule-20-4-10')!;
    const down = rule.legs.find((l) => l.id === 'down')!;
    expect(down.pass).toBe(true);
    expect(down.note).toMatch(/MAS already requires at least 40%/);
  });

  it('fails the OYC rule on the income leg while the down payment leg passes', () => {
    const rule = result.rules.find((r) => r.id === 'rule-oyc')!;
    expect(rule.legs.find((l) => l.id === 'down')!.pass).toBe(true);
    expect(rule.legs.find((l) => l.id === 'income')!.pass).toBe(false);
    expect(rule.status).toBe('FAIL');
  });

  it('passes TDSR even though the car is unaffordable — the point of having both', () => {
    expect(result.tdsr.pass).toBe(true);
    expect(result.tdsr.ratio).toBeCloseTo(2_059.2 / 8_000, 4);
  });

  it('states the income actually required', () => {
    expect(result.requiredGrossMonthlyIncome).toBeCloseTo(result.totalMonthlyCarCost / 0.15, 2);
    expect(result.requiredGrossMonthlyIncome).toBeGreaterThan(19_000);
  });

  it('reports an overall FAIL', () => {
    expect(result.status).toBe('FAIL');
  });
});

describe('evaluateScenario — upfront cash', () => {
  it('covers down payment, first year insurance and road tax, registration and a buffer', () => {
    const result = evaluateScenario(baseScenario());
    const labels = result.upfront.lines.map((l) => l.label);
    expect(labels).toContain('Down payment');
    expect(labels).toContain('First year insurance');
    expect(labels).toContain('3-month running cost buffer');

    const expected = 72_000 + 150 * 12 + 743 + 350 + 3 * (900 + 743 / 12);
    expect(result.upfront.total).toBeCloseTo(expected, 2);
  });
});

describe('evaluateScenario — a genuinely affordable case', () => {
  it('passes when income is high enough', () => {
    const s = baseScenario();
    const result = evaluateScenario({
      ...s,
      income: { ...s.income, grossMonthlyIncome: 30_000 },
      loan: { ...s.loan, tenureYears: 4 },
    });
    expect(result.rules.find((r) => r.id === 'rule-oyc')!.status).toBe('PASS');
    expect(result.status).toBe('PASS');
  });

  it('reports STRETCH between 15% and 20% of gross income', () => {
    const s = baseScenario();
    const result = evaluateScenario({
      ...s,
      income: { ...s.income, grossMonthlyIncome: 17_500 },
      loan: { ...s.loan, tenureYears: 4 },
    });
    expect(result.shareOfGrossIncome).toBeGreaterThan(0.15);
    expect(result.shareOfGrossIncome).toBeLessThan(0.2);
    expect(result.status).toBe('STRETCH');
  });
});

describe('evaluateScenario — regulatory gates', () => {
  it('fails outright when the down payment is below the MAS floor', () => {
    const s = baseScenario();
    const result = evaluateScenario({
      ...s,
      income: { ...s.income, grossMonthlyIncome: 50_000 },
      loan: { ...s.loan, downPaymentPct: 0.2 },
    });
    expect(result.loan.violations.map((v) => v.rule)).toContain('ltv');
    expect(result.status).toBe('FAIL');
  });

  it('fails when existing debt pushes TDSR past 55%', () => {
    const s = baseScenario();
    const result = evaluateScenario({
      ...s,
      income: { ...s.income, grossMonthlyIncome: 50_000, otherMonthlyDebt: 26_000 },
    });
    expect(result.tdsr.pass).toBe(false);
    expect(result.status).toBe('FAIL');
  });
});

describe('evaluateScenario — income handling', () => {
  it('derives take-home from CPF by default', () => {
    const result = evaluateScenario(baseScenario());
    expect(result.monthlyIncomeAfterCpf).toBe(6_400); // 8,000 - 20%
  });

  it('respects an explicit take-home override', () => {
    const s = baseScenario();
    const result = evaluateScenario({ ...s, income: { ...s.income, takeHomeOverride: 7_000 } });
    expect(result.monthlyIncomeAfterCpf).toBe(7_000);
  });

  it('includes bonus months in annual income', () => {
    const result = evaluateScenario(baseScenario());
    expect(result.annualGrossIncome).toBe(8_000 * 13);
  });

  it('compares the true cost against the budget the user set', () => {
    const result = evaluateScenario(baseScenario());
    expect(result.budgetDelta).toBeCloseTo(1_500 - result.totalMonthlyCarCost, 2);
    expect(result.budgetDelta).toBeLessThan(0);
  });
});
