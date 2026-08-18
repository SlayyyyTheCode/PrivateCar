import { describe, expect, it } from 'vitest';
import { annualRoadTax, ageSurchargeRate } from '../../src/core/roadTax';

describe('annualRoadTax — petrol', () => {
  it('matches the LTA worked example for a 1,798cc car', () => {
    // (475 + 0.75 * 198) * 0.782 * 2 = 975.15
    expect(annualRoadTax({ fuelType: 'petrol', engineCc: 1_798 })).toBe(975);
  });

  it('handles the smallest band as a flat amount', () => {
    // 200 * 0.782 * 2
    expect(annualRoadTax({ fuelType: 'petrol', engineCc: 600 })).toBe(313);
  });

  it('steps up correctly across band boundaries', () => {
    // 1,600cc sits at the top of the 1,001-1,600 band: (250 + 0.375 * 600) * 0.782 * 2
    expect(annualRoadTax({ fuelType: 'petrol', engineCc: 1_600 })).toBe(743);
    // 1,601cc crosses into the next band and jumps
    expect(annualRoadTax({ fuelType: 'petrol', engineCc: 1_601 })).toBe(744);
  });

  it('uses the open-ended band above 3,000cc', () => {
    // (1,525 + 1.0 * 500) * 0.782 * 2
    expect(annualRoadTax({ fuelType: 'petrol', engineCc: 3_500 })).toBe(3_167);
  });

  it('treats hybrids the same as petrol cars', () => {
    expect(annualRoadTax({ fuelType: 'hybrid', engineCc: 1_798 })).toBe(
      annualRoadTax({ fuelType: 'petrol', engineCc: 1_798 }),
    );
  });
});

describe('annualRoadTax — electric', () => {
  it('uses the kW bands and adds the $700 flat component', () => {
    // (250 + 3.75 * (150 - 30)) * 0.782 * 2 + 700
    expect(annualRoadTax({ fuelType: 'ev', motorPowerKw: 150 })).toBe(1_795);
  });

  it('surcharges the kW-based portion but not the flat component', () => {
    // 1,094.8 * 1.5 = 1,642, then + 700 flat
    expect(annualRoadTax({ fuelType: 'ev', motorPowerKw: 150, vehicleAgeYears: 15 })).toBe(2_342);
  });
});

describe('annualRoadTax — diesel', () => {
  it('applies the special tax multiplier', () => {
    const petrol = annualRoadTax({ fuelType: 'petrol', engineCc: 1_998 });
    const diesel = annualRoadTax({ fuelType: 'diesel', engineCc: 1_998 });
    expect(diesel).toBe(petrol * 6);
  });
});

describe('ageSurchargeRate', () => {
  it('is zero for the first ten years', () => {
    expect(ageSurchargeRate(0)).toBe(0);
    expect(ageSurchargeRate(10)).toBe(0);
  });

  it('adds 10% per year from year 11', () => {
    expect(ageSurchargeRate(11)).toBeCloseTo(0.1);
    expect(ageSurchargeRate(13)).toBeCloseTo(0.3);
  });

  it('caps at 50% from year 15', () => {
    expect(ageSurchargeRate(15)).toBeCloseTo(0.5);
    expect(ageSurchargeRate(22)).toBeCloseTo(0.5);
  });
});

describe('annualRoadTax — age surcharge applied end to end', () => {
  it('raises an 11-year-old 1,798cc car by 10%', () => {
    expect(annualRoadTax({ fuelType: 'petrol', engineCc: 1_798, vehicleAgeYears: 11 })).toBe(1_073);
  });
});
