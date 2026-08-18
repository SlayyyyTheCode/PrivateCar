import { LOAN_RULES } from '../data/sg-2026-08';

export interface LoanInput {
  /** Full purchase price of the car, including COE. */
  price: number;
  /** Open Market Value — determines the regulatory loan-to-value cap. */
  omv: number;
  downPaymentPct: number;
  tenureYears: number;
  /** Advertised flat rate per annum, as a percentage. */
  flatRatePct: number;
}

export type LoanViolationRule = 'ltv' | 'tenure';

export interface LoanViolation {
  rule: LoanViolationRule;
  message: string;
}

export interface LoanResult {
  downPayment: number;
  principal: number;
  maxAllowedPrincipal: number;
  totalInterest: number;
  totalRepayment: number;
  monthlyInstalment: number;
  months: number;
  flatRatePct: number;
  /** What the flat rate actually costs, expressed as a reducing-balance rate. */
  effectiveRatePct: number;
  violations: LoanViolation[];
}

/** MAS Notice 642 caps how much of the car you may borrow, based on its OMV. */
export function maxLtv(omv: number): number {
  return omv <= LOAN_RULES.lowOmvThreshold ? LOAN_RULES.maxLtvLowOmv : LOAN_RULES.maxLtvHighOmv;
}

export function minDownPaymentPct(omv: number): number {
  return 1 - maxLtv(omv);
}

/**
 * The reducing-balance rate that produces the same instalment as the quoted
 * flat rate. Singapore dealers always quote flat, which roughly halves the
 * apparent cost of borrowing; surfacing the effective rate is the point.
 *
 * Solved by bisection on the standard annuity identity, which is slower than
 * Newton's method but cannot diverge.
 */
export function effectiveInterestRate(principal: number, monthlyInstalment: number, months: number): number {
  if (principal <= 0 || monthlyInstalment <= 0 || months <= 0) return 0;

  // No interest at all — the payments exactly repay the principal.
  if (monthlyInstalment * months <= principal + 1e-9) return 0;

  const presentValue = (monthlyRate: number) =>
    monthlyRate === 0
      ? monthlyInstalment * months
      : (monthlyInstalment * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate;

  let low = 0;
  let high = 1; // 100% per month is far beyond any real loan
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    if (presentValue(mid) > principal) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 12 * 100;
}

export function computeLoan(input: LoanInput): LoanResult {
  const price = Math.max(0, input.price);
  const months = Math.max(1, Math.round(input.tenureYears * 12));

  const downPayment = price * input.downPaymentPct;
  const principal = Math.max(0, price - downPayment);
  const maxAllowedPrincipal = price * maxLtv(input.omv);

  const totalInterest = principal * (input.flatRatePct / 100) * input.tenureYears;
  const totalRepayment = principal + totalInterest;
  const monthlyInstalment = totalRepayment / months;

  const violations: LoanViolation[] = [];
  const minDownPct = minDownPaymentPct(input.omv);
  // Tolerate floating-point dust so an exact minimum down payment is not rejected.
  if (input.downPaymentPct < minDownPct - 1e-9) {
    violations.push({
      rule: 'ltv',
      message:
        `With an OMV of $${Math.round(input.omv).toLocaleString()}, MAS caps the loan at ` +
        `${Math.round(maxLtv(input.omv) * 100)}% of the price, so you must put down at least ` +
        `${Math.round(minDownPct * 100)}% ($${Math.round(price * minDownPct).toLocaleString()}).`,
    });
  }
  if (input.tenureYears > LOAN_RULES.maxTenureYears) {
    violations.push({
      rule: 'tenure',
      message: `Car loans in Singapore are capped at ${LOAN_RULES.maxTenureYears} years.`,
    });
  }

  return {
    downPayment,
    principal,
    maxAllowedPrincipal,
    totalInterest,
    totalRepayment,
    monthlyInstalment,
    months,
    flatRatePct: input.flatRatePct,
    effectiveRatePct: effectiveInterestRate(principal, monthlyInstalment, months),
    violations,
  };
}
