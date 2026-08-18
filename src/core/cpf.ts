import { CPF_EMPLOYEE_BANDS, CPF_OW_CEILING } from '../data/sg-2026-08';

/**
 * Employee CPF contribution rate for a given age.
 *
 * This is a convenience default only — the app always lets the user type their
 * actual take-home pay instead, which is more reliable than any rate table.
 */
export function employeeCpfRate(age: number): number {
  const band = CPF_EMPLOYEE_BANDS.find((b) => age <= b.upToAge);
  return band ? band.employeeRate : CPF_EMPLOYEE_BANDS[CPF_EMPLOYEE_BANDS.length - 1].employeeRate;
}

/** Employee's own CPF contribution, capped at the Ordinary Wage ceiling. */
export function monthlyCpfContribution(grossMonthlyIncome: number, age: number): number {
  const contributable = Math.min(Math.max(0, grossMonthlyIncome), CPF_OW_CEILING);
  return contributable * employeeCpfRate(age);
}

/** Cash actually landing in the bank each month. */
export function incomeAfterCpf(grossMonthlyIncome: number, age: number): number {
  return Math.max(0, grossMonthlyIncome) - monthlyCpfContribution(grossMonthlyIncome, age);
}

/** Twelve months of salary plus any AWS / bonus expressed in months. */
export function annualGrossIncome(grossMonthlyIncome: number, annualBonusMonths: number): number {
  return grossMonthlyIncome * (12 + Math.max(0, annualBonusMonths));
}
