import { annualRoadTax } from './roadTax';
import type { CarInputs, CostLine, RunningCostInputs } from './types';

export interface RunningCostResult {
  /** Every recurring cost, expressed per month. */
  lines: CostLine[];
  total: number;
  roadTaxAnnual: number;
}

/**
 * Total monthly running cost. Road tax is billed six-monthly or annually but is
 * spread across the year here so it sits alongside the other costs — leaving it
 * out is one of the most common ways people underestimate ownership.
 */
export function monthlyRunningCosts(running: RunningCostInputs, car: CarInputs): RunningCostResult {
  const roadTaxAnnual =
    running.roadTaxMode === 'manual'
      ? Math.max(0, running.roadTaxAnnualOverride)
      : annualRoadTax({
          fuelType: car.fuelType,
          engineCc: car.engineCc,
          motorPowerKw: car.motorPowerKw,
          vehicleAgeYears: car.vehicleAgeYears,
        });

  const lines: CostLine[] = [
    { label: car.fuelType === 'ev' ? 'Charging' : 'Petrol', amount: running.petrol },
    { label: 'Maintenance', amount: running.maintenance },
    { label: 'Servicing', amount: running.servicing },
    { label: 'Washing', amount: running.washing },
    { label: 'HDB season parking', amount: running.hdbSeasonParking },
    { label: 'Other parking', amount: running.otherParking },
    { label: 'Insurance', amount: running.insurance },
    { label: 'ERP', amount: running.erp },
    { label: 'Road tax', amount: roadTaxAnnual / 12 },
    ...running.others.map((other) => ({ label: other.label || 'Other', amount: other.monthly })),
  ].map((line) => ({ ...line, amount: Math.max(0, line.amount) }));

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    roadTaxAnnual,
  };
}
