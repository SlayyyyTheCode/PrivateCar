import { REGISTRATION_FEE, RULE_20_4_10, RULE_OYC, TDSR_CAP } from '../data/sg-2026-08';
import { annualGrossIncome, incomeAfterCpf } from './cpf';
import { computeLoan, minDownPaymentPct, type LoanResult } from './loan';
import { resolveCarPrice } from './price';
import { monthlyRunningCosts, type RunningCostResult } from './running';
import type { AffordabilityStatus, CostLine, RuleLeg, RuleResult, Scenario } from './types';

export interface TdsrResult {
  ratio: number;
  cap: number;
  pass: boolean;
  note: string;
}

export interface UpfrontCashResult {
  lines: CostLine[];
  total: number;
}

export interface VerdictResult {
  carPrice: number;
  loan: LoanResult;
  running: RunningCostResult;
  /** Loan instalment plus every recurring cost. */
  totalMonthlyCarCost: number;
  grossMonthlyIncome: number;
  monthlyIncomeAfterCpf: number;
  annualGrossIncome: number;
  shareOfGrossIncome: number;
  shareOfTakeHome: number;
  rules: RuleResult[];
  tdsr: TdsrResult;
  upfront: UpfrontCashResult;
  /** Gross monthly income needed to clear the OYC 15% threshold. */
  requiredGrossMonthlyIncome: number;
  /** Positive means the car fits inside the budget the user set. */
  budgetDelta: number;
  status: AffordabilityStatus;
}

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

function worst(...statuses: AffordabilityStatus[]): AffordabilityStatus {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.includes('STRETCH')) return 'STRETCH';
  return 'PASS';
}

/**
 * The American 20-4-10 rule, evaluated honestly against Singapore conditions.
 *
 * Two of its three legs cannot work here: 20% down is below the regulatory
 * floor, and 10% of income implies an income almost nobody buying a mainstream
 * car actually has. We still show it, because seeing exactly *how* it fails is
 * the clearest way to understand what Singapore ownership really demands.
 */
function evaluate20410(
  scenario: Scenario,
  price: number,
  totalMonthlyCarCost: number,
  grossMonthly: number,
): RuleResult {
  const legalMinDown = minDownPaymentPct(scenario.car.omv);
  const share = grossMonthly > 0 ? totalMonthlyCarCost / grossMonthly : Infinity;

  const legs: RuleLeg[] = [
    {
      id: 'down',
      label: '20% down payment',
      target: 'at least 20%',
      actual: pct(scenario.loan.downPaymentPct),
      pass: scenario.loan.downPaymentPct >= RULE_20_4_10.minDownPaymentPct,
      note:
        `Not applicable in Singapore — MAS already requires at least ${pct(legalMinDown)} ` +
        `(${money(price * legalMinDown)}) on this car, well above the 20% the rule asks for.`,
    },
    {
      id: 'tenure',
      label: '4-year loan term',
      target: '48 months or fewer',
      actual: `${scenario.loan.tenureYears} years`,
      pass: scenario.loan.tenureYears <= RULE_20_4_10.maxTenureYears,
      note:
        'This leg does apply here, and matters more than it does overseas: Singapore car ' +
        'loans charge flat interest, so every extra year adds the same interest again.',
    },
    {
      id: 'income',
      label: '10% of monthly income',
      target: `${money(grossMonthly * RULE_20_4_10.maxShareOfGrossIncome)} per month`,
      actual: `${money(totalMonthlyCarCost)} (${Number.isFinite(share) ? pct(share) : '—'})`,
      pass: share <= RULE_20_4_10.maxShareOfGrossIncome,
      note:
        `Effectively unreachable in Singapore — at ${money(totalMonthlyCarCost)} a month you ` +
        `would need to earn ${money(totalMonthlyCarCost / RULE_20_4_10.maxShareOfGrossIncome)} ` +
        'gross a month to satisfy it.',
    },
  ];

  return {
    id: 'rule-20-4-10',
    name: 'The 20-4-10 rule (United States)',
    legs,
    status: legs.every((leg) => leg.pass) ? 'PASS' : 'FAIL',
  };
}

/**
 * The Singapore-adapted rule OYC recommends.
 *
 * Down payment is the regulatory floor rather than a target, tenure is
 * tightened to 5 years because of flat-rate interest, and the income share is
 * raised to 15% (with 15-20% treated as a stretch) to match local guidance.
 */
function evaluateOyc(
  scenario: Scenario,
  price: number,
  totalMonthlyCarCost: number,
  grossMonthly: number,
): RuleResult {
  const legalMinDown = minDownPaymentPct(scenario.car.omv);
  const share = grossMonthly > 0 ? totalMonthlyCarCost / grossMonthly : Infinity;

  const downPass = scenario.loan.downPaymentPct >= legalMinDown - 1e-9;
  const tenurePass = scenario.loan.tenureYears <= RULE_OYC.maxTenureYears;
  const incomePass = share <= RULE_OYC.comfortableShareOfGrossIncome;
  const incomeStretch = share <= RULE_OYC.stretchShareOfGrossIncome;

  const legs: RuleLeg[] = [
    {
      id: 'down',
      label: `${pct(legalMinDown)} down payment`,
      target: `at least ${pct(legalMinDown)} (${money(price * legalMinDown)})`,
      actual: `${pct(scenario.loan.downPaymentPct)} (${money(price * scenario.loan.downPaymentPct)})`,
      pass: downPass,
      note: downPass
        ? 'Meets the regulatory minimum for this OMV band.'
        : 'Below the legal minimum — no bank in Singapore can write this loan.',
    },
    {
      id: 'tenure',
      label: '5-year loan term or shorter',
      target: `${RULE_OYC.maxTenureYears} years or fewer`,
      actual: `${scenario.loan.tenureYears} years`,
      pass: tenurePass,
      note: tenurePass
        ? 'Keeps flat-rate interest contained.'
        : `Legal up to 7 years, but each extra year adds roughly ` +
          `${money(scenario.loan.flatRatePct * 0.01 * price * (1 - scenario.loan.downPaymentPct))} in interest.`,
    },
    {
      id: 'income',
      label: '15% of gross monthly income',
      target: `${money(grossMonthly * RULE_OYC.comfortableShareOfGrossIncome)} per month`,
      actual: `${money(totalMonthlyCarCost)} (${Number.isFinite(share) ? pct(share) : '—'})`,
      pass: incomePass,
      note: incomePass
        ? 'All-in car costs sit inside a comfortable share of your income.'
        : incomeStretch
          ? 'Between 15% and 20% — doable, but it will squeeze savings and holidays.'
          : `Above 20% of gross income. You would need ` +
            `${money(totalMonthlyCarCost / RULE_OYC.comfortableShareOfGrossIncome)} gross a month ` +
            'for this car to be comfortable.',
    },
  ];

  let status: AffordabilityStatus = 'PASS';
  if (!downPass || !incomeStretch) status = 'FAIL';
  else if (!tenurePass || !incomePass) status = 'STRETCH';

  return { id: 'rule-oyc', name: 'The OYC rule (Singapore-adapted)', legs, status };
}

/** Cash you must physically have before you can drive away. */
function computeUpfront(
  price: number,
  loan: LoanResult,
  running: RunningCostResult,
  scenario: Scenario,
): UpfrontCashResult {
  const lines: CostLine[] = [
    { label: 'Down payment', amount: loan.downPayment },
    { label: 'First year insurance', amount: scenario.running.insurance * 12 },
    { label: 'First year road tax', amount: running.roadTaxAnnual },
    { label: 'Registration fee', amount: REGISTRATION_FEE },
    {
      label: `${RULE_OYC.cashBufferMonths}-month running cost buffer`,
      amount: running.total * RULE_OYC.cashBufferMonths,
    },
  ];
  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) };
}

/** The single entry point the UI calls. Everything else here is a helper. */
export function evaluateScenario(scenario: Scenario): VerdictResult {
  const price = resolveCarPrice(scenario.car);

  const loan = computeLoan({
    price,
    omv: scenario.car.omv,
    downPaymentPct: scenario.loan.downPaymentPct,
    tenureYears: scenario.loan.tenureYears,
    flatRatePct: scenario.loan.flatRatePct,
  });

  const running = monthlyRunningCosts(scenario.running, scenario.car);
  const totalMonthlyCarCost = loan.monthlyInstalment + running.total;

  const grossMonthly = Math.max(0, scenario.income.grossMonthlyIncome);
  const takeHome =
    scenario.income.takeHomeOverride !== null
      ? Math.max(0, scenario.income.takeHomeOverride)
      : incomeAfterCpf(grossMonthly, scenario.income.age);

  const tdsrRatio =
    grossMonthly > 0 ? (loan.monthlyInstalment + Math.max(0, scenario.income.otherMonthlyDebt)) / grossMonthly : Infinity;
  const tdsrPass = tdsrRatio <= TDSR_CAP;

  const rules = [
    evaluate20410(scenario, price, totalMonthlyCarCost, grossMonthly),
    evaluateOyc(scenario, price, totalMonthlyCarCost, grossMonthly),
  ];

  const oycStatus = rules[1].status;
  const status = worst(oycStatus, tdsrPass ? 'PASS' : 'FAIL', loan.violations.length > 0 ? 'FAIL' : 'PASS');

  return {
    carPrice: price,
    loan,
    running,
    totalMonthlyCarCost,
    grossMonthlyIncome: grossMonthly,
    monthlyIncomeAfterCpf: takeHome,
    annualGrossIncome: annualGrossIncome(grossMonthly, scenario.income.annualBonusMonths),
    shareOfGrossIncome: grossMonthly > 0 ? totalMonthlyCarCost / grossMonthly : Infinity,
    shareOfTakeHome: takeHome > 0 ? totalMonthlyCarCost / takeHome : Infinity,
    rules,
    tdsr: {
      ratio: tdsrRatio,
      cap: TDSR_CAP,
      pass: tdsrPass,
      note: tdsrPass
        ? 'Your total debt servicing stays inside the 55% regulatory ceiling.'
        : 'Your total monthly debt exceeds 55% of gross income. Lenders are required to decline this.',
    },
    upfront: computeUpfront(price, loan, running, scenario),
    requiredGrossMonthlyIncome: totalMonthlyCarCost / RULE_OYC.comfortableShareOfGrossIncome,
    budgetDelta: scenario.running.monthlyBudget - totalMonthlyCarCost,
    status,
  };
}
