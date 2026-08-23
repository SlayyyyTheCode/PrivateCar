/**
 * Singapore reference data, version-stamped.
 *
 * Every figure here is a *default* the user can override in the app. The Learn
 * tab renders `DATA_AS_OF` and `SOURCES` verbatim so the vintage of the numbers
 * is always visible — car costs in Singapore move fast, and stale numbers
 * presented confidently would be worse than no app at all.
 */

import type { ParfScheme } from '../core/types';

export const DATA_AS_OF = 'August 2026';

export interface Source {
  label: string;
  url: string;
  note?: string;
}

export const SOURCES: Source[] = [
  {
    label: 'SingSaver — How much do you need to afford a car in Singapore',
    url: 'https://www.singsaver.com.sg/car-insurance/blog/how-much-do-you-need-to-afford-a-car-in-singapore',
  },
  {
    label: 'SingSaver — How to calculate a car loan payment in Singapore',
    url: 'https://www.singsaver.com.sg/car-insurance/blog/how-to-calculate-a-car-loan-payment-in-singapore',
  },
  {
    label: 'SingSaver — First-time car buyer guide',
    url: 'https://www.singsaver.com.sg/car-insurance/blog/first-time-car-buyer-guide',
  },
  {
    label: 'MoneySmart — Cost of car ownership in Singapore',
    url: 'https://www.moneysmart.sg/personal-loan/car-ownership-singapore-cost-loans-ms',
    note: 'Blocks automated access; figures cross-checked against LTA, HDB and Motorist.',
  },
  {
    label: 'LTA — COE bidding results',
    url: 'https://www.lta.gov.sg/content/dam/ltagov/who_we_are/statistics_and_publications/statistics/pdf/M11-COE_Results_2025_2026.pdf',
  },
  {
    label: 'Motorist — Latest COE prices',
    url: 'https://www.motorist.sg/coe-results',
  },
  {
    label: 'HDB — Season parking charges',
    url: 'https://www.hdb.gov.sg/car-parks/season-parking-tickets',
  },
  {
    label: 'CPF Board — Contribution rates',
    url: 'https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay',
  },
];

// ---------------------------------------------------------------------------
// COE — August 2026, first bidding exercise
// ---------------------------------------------------------------------------

export const COE = {
  catA: 123_890, // cars up to 1,600cc and 97kW
  catB: 129_910, // cars above 1,600cc or 97kW
  /** A COE runs for 10 years. */
  validityMonths: 120,
};

// ---------------------------------------------------------------------------
// Additional Registration Fee — marginal tiers on OMV
// ---------------------------------------------------------------------------

export interface ArfTier {
  /** Lower bound of the band, exclusive of the previous band's upper bound. */
  from: number;
  /** Upper bound, or null for the top open-ended band. */
  to: number | null;
  /** Rate applied to the portion of OMV falling inside this band. */
  rate: number;
}

export const ARF_TIERS: ArfTier[] = [
  { from: 0, to: 20_000, rate: 1.0 },
  { from: 20_000, to: 40_000, rate: 1.4 },
  { from: 40_000, to: 60_000, rate: 1.9 },
  { from: 60_000, to: 80_000, rate: 2.5 },
  { from: 80_000, to: null, rate: 3.2 },
];

/** Flat vehicle registration fee. */
export const REGISTRATION_FEE = 350;

/** Excise duty charged on OMV before GST. */
export const EXCISE_DUTY_RATE = 0.2;

/** GST, charged on OMV plus excise duty. */
export const GST_RATE = 0.09;

// ---------------------------------------------------------------------------
// Road tax
// ---------------------------------------------------------------------------

export interface RoadTaxBand {
  /** Upper bound of the band (cc for ICE, kW for EV), or null for open-ended. */
  upTo: number | null;
  base: number;
  /** Marginal rate applied per cc / kW above `floor`. */
  perUnit: number;
  floor: number;
}

/** Six-monthly base figures. Multiply by ROAD_TAX_REBATE_FACTOR, then by 2 for annual. */
export const ROAD_TAX_BANDS_ICE: RoadTaxBand[] = [
  { upTo: 600, base: 200, perUnit: 0, floor: 0 },
  { upTo: 1_000, base: 200, perUnit: 0.125, floor: 600 },
  { upTo: 1_600, base: 250, perUnit: 0.375, floor: 1_000 },
  { upTo: 3_000, base: 475, perUnit: 0.75, floor: 1_600 },
  { upTo: null, base: 1_525, perUnit: 1.0, floor: 3_000 },
];

export const ROAD_TAX_BANDS_EV: RoadTaxBand[] = [
  { upTo: 7.5, base: 200, perUnit: 0, floor: 0 },
  { upTo: 30, base: 200, perUnit: 2.0, floor: 7.5 },
  { upTo: 230, base: 250, perUnit: 3.75, floor: 30 },
  { upTo: null, base: 1_525, perUnit: 10.0, floor: 230 },
];

export const ROAD_TAX_REBATE_FACTOR = 0.782;

/** Additional Flat Component charged annually on electric cars since 1 Jan 2023. */
export const EV_ADDITIONAL_FLAT_COMPONENT = 700;

/** Diesel cars pay a special tax on top of the standard road tax. */
export const DIESEL_SPECIAL_TAX_MULTIPLIER = 6;

/** +10% per year from year 11, capped at +50% from year 15. */
export const ROAD_TAX_AGE_SURCHARGE = {
  startsAfterYears: 10,
  perYear: 0.1,
  cap: 0.5,
};

// ---------------------------------------------------------------------------
// Car loans — MAS Notice 642
// ---------------------------------------------------------------------------

export const LOAN_RULES = {
  /** OMV at or below this gets the more generous loan-to-value cap. */
  lowOmvThreshold: 20_000,
  maxLtvLowOmv: 0.7, // 30% minimum down payment
  maxLtvHighOmv: 0.6, // 40% minimum down payment
  maxTenureYears: 7,
  minTenureYears: 1,
  /** Advertised flat rates seen in the market. */
  typicalFlatRatePct: { min: 2.68, max: 3.5, default: 2.88 },
};

/** Total Debt Servicing Ratio: all monthly debt obligations vs gross monthly income. */
export const TDSR_CAP = 0.55;

// ---------------------------------------------------------------------------
// Affordability rules
// ---------------------------------------------------------------------------

/** The American rule of thumb, kept for the side-by-side comparison. */
export const RULE_20_4_10 = {
  minDownPaymentPct: 0.2,
  maxTenureYears: 4,
  maxShareOfGrossIncome: 0.1,
};

/**
 * The Singapore-adapted rule. Down payment is the regulatory floor rather than
 * a choice, the tenure is tightened because local loans are flat-rate, and the
 * income share is raised to a level that is actually reachable here.
 */
export const RULE_OYC = {
  maxTenureYears: 5,
  /** Months of running costs to hold as a buffer before buying. */
  cashBufferMonths: 3,
  // The income dimension deliberately lives in src/core/bands.ts rather than
  // here. It is the number the app puts on screen everywhere, and holding two
  // copies of it produced a build where the verdict tab and the landing page
  // disagreed about the same car.
};

// ---------------------------------------------------------------------------
// PARF rebate schedules
// ---------------------------------------------------------------------------

export interface ParfBand {
  /** Applies when the car is at most this many years old at deregistration. */
  upToYears: number;
  rateOfArf: number;
}

export interface ParfScheduleDef {
  label: string;
  description: string;
  cap: number;
  bands: ParfBand[];
}

export const PARF_SCHEDULES: Record<ParfScheme, ParfScheduleDef> = {
  from2026: {
    label: 'Registered from Feb 2026',
    description: 'Budget 2026 schedule. Rebate starts at 30% of ARF and is capped at $30,000.',
    cap: 30_000,
    bands: [
      { upToYears: 5, rateOfArf: 0.3 },
      { upToYears: 6, rateOfArf: 0.25 },
      { upToYears: 7, rateOfArf: 0.2 },
      { upToYears: 8, rateOfArf: 0.15 },
      { upToYears: 9, rateOfArf: 0.1 },
      { upToYears: 10, rateOfArf: 0.05 },
    ],
  },
  legacy: {
    label: 'Registered Feb 2023 – Jan 2026',
    description: 'Previous schedule. Rebate starts at 75% of ARF and is capped at $60,000.',
    cap: 60_000,
    bands: [
      { upToYears: 5, rateOfArf: 0.75 },
      { upToYears: 6, rateOfArf: 0.7 },
      { upToYears: 7, rateOfArf: 0.65 },
      { upToYears: 8, rateOfArf: 0.6 },
      { upToYears: 9, rateOfArf: 0.55 },
      { upToYears: 10, rateOfArf: 0.5 },
    ],
  },
};

// ---------------------------------------------------------------------------
// CPF — employee contribution rates
// ---------------------------------------------------------------------------

/** Monthly Ordinary Wage ceiling for CPF contributions. */
export const CPF_OW_CEILING = 8_000;

export interface CpfBand {
  /** Applies when age is at most this. */
  upToAge: number;
  employeeRate: number;
}

export const CPF_EMPLOYEE_BANDS: CpfBand[] = [
  { upToAge: 55, employeeRate: 0.2 },
  { upToAge: 60, employeeRate: 0.17 },
  { upToAge: 65, employeeRate: 0.115 },
  { upToAge: 70, employeeRate: 0.075 },
  { upToAge: Infinity, employeeRate: 0.05 },
];

// ---------------------------------------------------------------------------
// Typical running costs — starting points only, all user-editable
// ---------------------------------------------------------------------------

export const PARKING = {
  hdbSurfaceFirstCar: 80,
  hdbShelteredFirstCar: 110,
  uraSeasonParking: 90,
  gstRate: 0.09,
};

export const TYPICAL_MONTHLY_COSTS = {
  petrol: 300,
  maintenance: 80,
  servicing: 60,
  washing: 20,
  hdbSeasonParking: PARKING.hdbShelteredFirstCar,
  otherParking: 120,
  insurance: 150,
  erp: 60,
};
