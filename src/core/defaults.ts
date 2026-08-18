import { COE, LOAN_RULES, TYPICAL_MONTHLY_COSTS } from '../data/sg-2026-08';
import { minDownPaymentPct } from './loan';
import type { Scenario } from './types';

/**
 * A realistic starting point: a mainstream new Cat A car bought by someone on a
 * median-ish professional salary. Every field is editable in the app — these
 * only exist so the first screen is never empty.
 */
export function createDefaultScenario(overrides: Partial<Scenario> = {}): Scenario {
  const omv = 30_000;

  return {
    id: 'default',
    name: 'My first car',
    income: {
      grossMonthlyIncome: 8_000,
      annualBonusMonths: 1,
      age: 30,
      takeHomeOverride: null,
      otherMonthlyDebt: 0,
    },
    car: {
      priceMode: 'total',
      totalPrice: 185_000,
      omv,
      coe: COE.catA,
      dealerMargin: 10_000,
      fuelType: 'petrol',
      engineCc: 1_598,
      motorPowerKw: 0,
      vehicleAgeYears: 0,
      coeMonthsRemaining: COE.validityMonths,
      parfScheme: 'from2026',
    },
    loan: {
      downPaymentPct: minDownPaymentPct(omv),
      tenureYears: 5,
      flatRatePct: LOAN_RULES.typicalFlatRatePct.default,
    },
    running: {
      ...TYPICAL_MONTHLY_COSTS,
      roadTaxMode: 'auto',
      roadTaxAnnualOverride: 0,
      others: [],
      monthlyBudget: 1_500,
    },
    ...overrides,
  };
}
