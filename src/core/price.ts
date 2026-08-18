import { EXCISE_DUTY_RATE, GST_RATE, REGISTRATION_FEE } from '../data/sg-2026-08';
import { calculateArf } from './arf';
import type { CarInputs, CostLine } from './types';

export interface PriceBuildUp {
  lines: CostLine[];
  total: number;
}

/**
 * Reconstructs a Singapore car's on-the-road price from its Open Market Value.
 *
 * Useful even when the user already knows the dealer price: seeing that the
 * actual vehicle is often under a fifth of what you pay is the fastest way to
 * understand why cars here cost what they do.
 */
export function buildUpPrice(car: CarInputs): PriceBuildUp {
  const omv = Math.max(0, car.omv);
  const excise = omv * EXCISE_DUTY_RATE;
  const gst = (omv + excise) * GST_RATE;
  const arf = calculateArf(omv);

  const lines: CostLine[] = [
    { label: 'Open Market Value (OMV)', amount: omv },
    { label: 'Excise duty (20% of OMV)', amount: excise },
    { label: 'GST (9%)', amount: gst },
    { label: 'Additional Registration Fee (ARF)', amount: arf },
    { label: 'COE', amount: Math.max(0, car.coe) },
    { label: 'Registration fee', amount: REGISTRATION_FEE },
    { label: 'Dealer margin', amount: Math.max(0, car.dealerMargin) },
  ];

  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) };
}

/** The price every downstream calculation works from. */
export function resolveCarPrice(car: CarInputs): number {
  return car.priceMode === 'total' ? Math.max(0, car.totalPrice) : buildUpPrice(car).total;
}
