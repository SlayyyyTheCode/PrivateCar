import { COE, PARF_SCHEDULES } from '../data/sg-2026-08';
import { calculateArf } from './arf';
import { computeLoan } from './loan';
import { resolveCarPrice } from './price';
import { monthlyRunningCosts } from './running';
import type { CostLine, ParfScheme, Scenario } from './types';

export interface TcoResult {
  holdingMonths: number;
  holdingYears: number;
  carPrice: number;
  arf: number;
  outflows: CostLine[];
  grossOutlay: number;
  parfRebate: number;
  coeRebate: number;
  totalRebate: number;
  /** What the car actually costs you over the holding period, after rebates. */
  netCost: number;
  effectiveMonthlyCost: number;
  /** The figure the used-car market quotes: net loss per year of ownership. */
  annualDepreciation: number;
}

/**
 * Preferential Additional Registration Fee rebate — part of the ARF returned
 * when a car is deregistered before it turns 10.
 *
 * Budget 2026 cut this sharply for cars registered from February 2026, which is
 * why the schedule is selectable: most used cars on the market still sit on the
 * older, far more generous one.
 */
export function parfRebate(arf: number, ageAtDeregYears: number, scheme: ParfScheme): number {
  const schedule = PARF_SCHEDULES[scheme];
  const band = schedule.bands.find((b) => ageAtDeregYears <= b.upToYears);
  if (!band || arf <= 0) return 0;
  return Math.min(arf * band.rateOfArf, schedule.cap);
}

/** Unused portion of the COE, returned pro-rata on deregistration. */
export function coeRebate(coePaid: number, monthsRemaining: number): number {
  if (coePaid <= 0 || monthsRemaining <= 0) return 0;
  return (coePaid * Math.min(monthsRemaining, COE.validityMonths)) / COE.validityMonths;
}

/**
 * Full cost of ownership across the holding period.
 *
 * Defaults to running the COE to expiry, which is what makes the rebate maths
 * bite: hold to year 10 and the PARF rebate has decayed to almost nothing.
 */
export function computeTco(scenario: Scenario, holdingMonthsOverride?: number): TcoResult {
  const price = resolveCarPrice(scenario.car);
  const holdingMonths = Math.max(1, holdingMonthsOverride ?? scenario.car.coeMonthsRemaining);
  const holdingYears = holdingMonths / 12;

  const loan = computeLoan({
    price,
    omv: scenario.car.omv,
    downPaymentPct: scenario.loan.downPaymentPct,
    tenureYears: scenario.loan.tenureYears,
    flatRatePct: scenario.loan.flatRatePct,
  });
  const running = monthlyRunningCosts(scenario.running, scenario.car);

  // The loan can finish well before you sell the car, so cap instalments at the
  // loan term rather than charging them for the whole holding period.
  const instalmentMonths = Math.min(loan.months, holdingMonths);
  const totalInstalments = loan.monthlyInstalment * instalmentMonths;
  const outstandingAtSale = loan.totalRepayment - totalInstalments;

  const outflows: CostLine[] = [
    { label: 'Down payment', amount: loan.downPayment },
    { label: 'Loan instalments paid', amount: totalInstalments },
    { label: 'Loan still owing at sale', amount: outstandingAtSale },
    { label: 'Running costs', amount: running.total * holdingMonths },
  ];
  const grossOutlay = outflows.reduce((sum, line) => sum + line.amount, 0);

  const arf = calculateArf(scenario.car.omv);
  const ageAtDereg = scenario.car.vehicleAgeYears + holdingYears;
  const monthsLeftAtSale = Math.max(0, scenario.car.coeMonthsRemaining - holdingMonths);

  const parf = parfRebate(arf, ageAtDereg, scenario.car.parfScheme);
  const coe = coeRebate(scenario.car.coe, monthsLeftAtSale);
  const totalRebate = parf + coe;

  const netCost = grossOutlay - totalRebate;

  return {
    holdingMonths,
    holdingYears,
    carPrice: price,
    arf,
    outflows,
    grossOutlay,
    parfRebate: parf,
    coeRebate: coe,
    totalRebate,
    netCost,
    effectiveMonthlyCost: netCost / holdingMonths,
    annualDepreciation: (price - totalRebate) / holdingYears,
  };
}
