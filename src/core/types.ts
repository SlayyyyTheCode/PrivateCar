/**
 * Shared types for the OYC affordability engine.
 *
 * Everything in `src/core` is pure TypeScript with no React Native imports so
 * that the Singapore finance rules can be unit tested under plain Node.
 */

export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'ev';

/** Which PARF rebate schedule applies, keyed off the car's registration date. */
export type ParfScheme = 'from2026' | 'legacy';

/** How the user tells us what the car costs. */
export type PriceMode = 'total' | 'buildUp';

export interface IncomeInputs {
  /** Basic gross salary per month, before CPF. */
  grossMonthlyIncome: number;
  /** AWS / bonus expressed in months of gross salary (e.g. 2 = 13th + 14th month). */
  annualBonusMonths: number;
  /** Drives the employee CPF contribution rate. */
  age: number;
  /** If set, used verbatim as take-home instead of the CPF-derived figure. */
  takeHomeOverride: number | null;
  /** Existing monthly debt obligations (mortgage, other loans) for the TDSR check. */
  otherMonthlyDebt: number;
}

export interface CarInputs {
  priceMode: PriceMode;
  /** Dealer's advertised price including COE. Used when priceMode is 'total'. */
  totalPrice: number;
  /** Open Market Value. Drives ARF and the regulatory loan-to-value cap. */
  omv: number;
  /** COE premium paid. Used for the build-up price and for the COE rebate. */
  coe: number;
  /** Dealer margin / registration extras. Used when priceMode is 'buildUp'. */
  dealerMargin: number;
  fuelType: FuelType;
  /** Engine capacity in cc. Ignored for EVs. */
  engineCc: number;
  /** Maximum motor power in kW. Only used for EVs. */
  motorPowerKw: number;
  /** 0 for a brand new car. Drives the road tax age surcharge. */
  vehicleAgeYears: number;
  /** 120 for a fresh COE. Drives the holding period and the COE rebate. */
  coeMonthsRemaining: number;
  parfScheme: ParfScheme;
}

export interface LoanInputs {
  /** Fraction of the car price paid upfront, 0..1. */
  downPaymentPct: number;
  tenureYears: number;
  /** Advertised flat rate per annum, as a percentage (e.g. 2.88). */
  flatRatePct: number;
}

export interface CustomCostLine {
  id: string;
  label: string;
  monthly: number;
}

export interface RunningCostInputs {
  /** All figures are per month, in SGD. */
  petrol: number;
  maintenance: number;
  servicing: number;
  washing: number;
  hdbSeasonParking: number;
  otherParking: number;
  insurance: number;
  erp: number;
  /** 'auto' derives road tax from engine size / motor power; 'manual' uses the override. */
  roadTaxMode: 'auto' | 'manual';
  roadTaxAnnualOverride: number;
  others: CustomCostLine[];
  /** What the user *thinks* they can spend on the car each month. */
  monthlyBudget: number;
}

export interface Scenario {
  id: string;
  name: string;
  income: IncomeInputs;
  car: CarInputs;
  loan: LoanInputs;
  running: RunningCostInputs;
}

/** PASS = comfortably affordable, STRETCH = doable but tight, FAIL = don't. */
export type AffordabilityStatus = 'PASS' | 'STRETCH' | 'FAIL';

export interface RuleLeg {
  id: string;
  label: string;
  /** Human-readable target, e.g. "at least 40%". */
  target: string;
  /** Human-readable actual, e.g. "20%". */
  actual: string;
  pass: boolean;
  /** Plain-English explanation, shown whether the leg passes or fails. */
  note: string;
}

export interface RuleResult {
  id: string;
  name: string;
  legs: RuleLeg[];
  status: AffordabilityStatus;
}

export interface CostLine {
  label: string;
  amount: number;
}
