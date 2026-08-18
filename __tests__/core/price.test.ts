import { describe, expect, it } from 'vitest';
import { buildUpPrice, resolveCarPrice } from '../../src/core/price';
import type { CarInputs } from '../../src/core/types';

const car: CarInputs = {
  priceMode: 'buildUp',
  totalPrice: 0,
  omv: 30_000,
  coe: 123_890,
  dealerMargin: 10_000,
  fuelType: 'petrol',
  engineCc: 1_598,
  motorPowerKw: 0,
  vehicleAgeYears: 0,
  coeMonthsRemaining: 120,
  parfScheme: 'from2026',
};

describe('buildUpPrice', () => {
  it('adds every statutory component to the OMV', () => {
    const { lines, total } = buildUpPrice(car);
    const byLabel = Object.fromEntries(lines.map((l) => [l.label, l.amount]));

    expect(byLabel['Open Market Value (OMV)']).toBe(30_000);
    expect(byLabel['Excise duty (20% of OMV)']).toBe(6_000);
    expect(byLabel['GST (9%)']).toBeCloseTo(3_240, 6); // 9% of (30,000 + 6,000)
    expect(byLabel['Additional Registration Fee (ARF)']).toBe(34_000);
    expect(byLabel['COE']).toBe(123_890);
    expect(byLabel['Registration fee']).toBe(350);
    expect(byLabel['Dealer margin']).toBe(10_000);

    expect(total).toBeCloseTo(207_480, 6);
  });

  it('shows how little of the price is the actual car', () => {
    const { total } = buildUpPrice(car);
    expect(car.omv / total).toBeLessThan(0.2);
  });
});

describe('resolveCarPrice', () => {
  it('uses the dealer price verbatim in total mode', () => {
    expect(resolveCarPrice({ ...car, priceMode: 'total', totalPrice: 185_000 })).toBe(185_000);
  });

  it('falls back to the build-up in buildUp mode', () => {
    expect(resolveCarPrice(car)).toBeCloseTo(207_480, 6);
  });
});
