import {
  DIESEL_SPECIAL_TAX_MULTIPLIER,
  EV_ADDITIONAL_FLAT_COMPONENT,
  ROAD_TAX_AGE_SURCHARGE,
  ROAD_TAX_BANDS_EV,
  ROAD_TAX_BANDS_ICE,
  ROAD_TAX_REBATE_FACTOR,
  type RoadTaxBand,
} from '../data/sg-2026-08';
import type { FuelType } from './types';

export interface RoadTaxInput {
  fuelType: FuelType;
  /** Engine capacity in cc. Required for petrol, diesel and hybrid. */
  engineCc?: number;
  /** Maximum motor power in kW. Required for EVs. */
  motorPowerKw?: number;
  /** Age of the vehicle in years. 0 for new. */
  vehicleAgeYears?: number;
}

function bandFor(bands: RoadTaxBand[], value: number): RoadTaxBand {
  return bands.find((band) => band.upTo === null || value <= band.upTo) ?? bands[bands.length - 1];
}

/** Older cars pay more: +10% per year from year 11, capped at +50% from year 15. */
export function ageSurchargeRate(vehicleAgeYears: number): number {
  const yearsOver = vehicleAgeYears - ROAD_TAX_AGE_SURCHARGE.startsAfterYears;
  if (yearsOver <= 0) return 0;
  return Math.min(yearsOver * ROAD_TAX_AGE_SURCHARGE.perYear, ROAD_TAX_AGE_SURCHARGE.cap);
}

/**
 * Annual road tax in SGD.
 *
 * LTA publishes six-monthly figures which are then scaled by a rebate factor;
 * we double the result for the annual charge. EVs pay an Additional Flat
 * Component on top, which is not subject to the age surcharge.
 */
export function annualRoadTax(input: RoadTaxInput): number {
  const age = input.vehicleAgeYears ?? 0;
  const isEv = input.fuelType === 'ev';

  const bands = isEv ? ROAD_TAX_BANDS_EV : ROAD_TAX_BANDS_ICE;
  const value = Math.max(0, isEv ? (input.motorPowerKw ?? 0) : (input.engineCc ?? 0));
  const band = bandFor(bands, value);

  const sixMonthly = (band.base + band.perUnit * Math.max(0, value - band.floor)) * ROAD_TAX_REBATE_FACTOR;
  const withSurcharge = sixMonthly * 2 * (1 + ageSurchargeRate(age));

  let annual = Math.round(withSurcharge);
  if (isEv) annual += EV_ADDITIONAL_FLAT_COMPONENT;
  if (input.fuelType === 'diesel') annual *= DIESEL_SPECIAL_TAX_MULTIPLIER;

  return annual;
}
