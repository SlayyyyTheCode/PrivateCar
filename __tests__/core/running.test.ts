import { describe, expect, it } from 'vitest';
import { monthlyRunningCosts } from '../../src/core/running';
import { createDefaultScenario } from '../../src/core/defaults';

describe('monthlyRunningCosts', () => {
  it('sums every recurring cost and spreads road tax across the year', () => {
    const scenario = createDefaultScenario();
    const result = monthlyRunningCosts(scenario.running, scenario.car);

    // 1,598cc -> (250 + 0.375 * 598) * 0.782 * 2 = $742/year road tax
    expect(result.roadTaxAnnual).toBe(742);
    const roadTaxLine = result.lines.find((l) => l.label === 'Road tax');
    expect(roadTaxLine?.amount).toBeCloseTo(742 / 12, 6);

    // 300 + 80 + 60 + 20 + 110 + 120 + 150 + 60 = 900, plus road tax
    expect(result.total).toBeCloseTo(900 + 742 / 12, 6);
  });

  it('honours a manual road tax override', () => {
    const scenario = createDefaultScenario();
    const result = monthlyRunningCosts(
      { ...scenario.running, roadTaxMode: 'manual', roadTaxAnnualOverride: 1_200 },
      scenario.car,
    );
    expect(result.roadTaxAnnual).toBe(1_200);
  });

  it('labels the fuel line Charging for an EV', () => {
    const scenario = createDefaultScenario();
    const result = monthlyRunningCosts(scenario.running, {
      ...scenario.car,
      fuelType: 'ev',
      motorPowerKw: 150,
    });
    expect(result.lines[0].label).toBe('Charging');
    expect(result.roadTaxAnnual).toBe(1_795);
  });

  it('includes user-defined extra cost lines', () => {
    const scenario = createDefaultScenario();
    const result = monthlyRunningCosts(
      { ...scenario.running, others: [{ id: 'a', label: 'Season pass at office', monthly: 200 }] },
      scenario.car,
    );
    expect(result.lines.some((l) => l.label === 'Season pass at office')).toBe(true);
    expect(result.total).toBeCloseTo(1_100 + 742 / 12, 6);
  });

  it('treats negative inputs as zero rather than crediting them', () => {
    const scenario = createDefaultScenario();
    const result = monthlyRunningCosts({ ...scenario.running, petrol: -500 }, scenario.car);
    expect(result.total).toBeCloseTo(600 + 742 / 12, 6);
  });
});
