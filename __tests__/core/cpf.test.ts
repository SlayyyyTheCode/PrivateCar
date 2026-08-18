import { describe, expect, it } from 'vitest';
import { employeeCpfRate, monthlyCpfContribution, incomeAfterCpf, annualGrossIncome } from '../../src/core/cpf';

describe('employeeCpfRate', () => {
  it('is 20% up to age 55', () => {
    expect(employeeCpfRate(30)).toBe(0.2);
    expect(employeeCpfRate(55)).toBe(0.2);
  });

  it('steps down through the older age bands', () => {
    expect(employeeCpfRate(58)).toBe(0.17);
    expect(employeeCpfRate(63)).toBe(0.115);
    expect(employeeCpfRate(68)).toBe(0.075);
    expect(employeeCpfRate(75)).toBe(0.05);
  });
});

describe('monthlyCpfContribution', () => {
  it('takes 20% of gross for a typical worker', () => {
    expect(monthlyCpfContribution(5_000, 30)).toBe(1_000);
  });

  it('stops at the $8,000 Ordinary Wage ceiling', () => {
    expect(monthlyCpfContribution(8_000, 30)).toBe(1_600);
    // Everything above $8,000 is uncapped take-home
    expect(monthlyCpfContribution(20_000, 30)).toBe(1_600);
  });
});

describe('incomeAfterCpf', () => {
  it('subtracts the employee contribution from gross', () => {
    expect(incomeAfterCpf(5_000, 30)).toBe(4_000);
  });

  it('leaves income above the ceiling fully in hand', () => {
    expect(incomeAfterCpf(20_000, 30)).toBe(18_400);
  });
});

describe('annualGrossIncome', () => {
  it('is twelve months plus any bonus months', () => {
    expect(annualGrossIncome(5_000, 0)).toBe(60_000);
    expect(annualGrossIncome(5_000, 2)).toBe(70_000);
  });
});
