/**
 * Historical cost series and typical market rates.
 *
 * COE is fetched live from LTA's dataset on data.gov.sg — it moves twice a
 * month and there is an authoritative feed, so bundling it would be worse than
 * useless. What is bundled here is everything with no public feed: pump prices,
 * parking revisions, and the going rate for servicing, washing and insurance.
 *
 * Bundled figures are marked with how they were sourced. Anything assembled
 * from published reference points rather than an official series says so, on
 * screen as well as here — a number presented with more confidence than it
 * deserves is the one failure mode this app cannot have.
 */

export interface TimePoint {
  /** ISO date. Series with only annual resolution use the first of January. */
  date: string;
  value: number;
  /**
   * Overrides the axis label. COE uses it to say "Aug 2026 · 2nd exercise",
   * because the dataset gives the month and round but never the closing day.
   */
  label?: string;
}

export interface Series {
  id: string;
  label: string;
  /** Rendered on the axis and in tooltips. */
  unit: string;
  points: TimePoint[];
}

export interface HistorySource {
  label: string;
  url: string;
  /** How reliable the series is, said plainly. */
  basis: 'official' | 'indicative';
  note: string;
}

// ---------------------------------------------------------------------------
// COE — live, with a floor of bundled points if the feed is unreachable
// ---------------------------------------------------------------------------

export const COE_DATASET_ID = 'd_69b3380ad7e51aff3a7dcc84eba52b8a';

export const COE_SOURCE: HistorySource = {
  label: 'LTA — COE bidding results, via data.gov.sg',
  url: 'https://data.gov.sg/datasets/d_69b3380ad7e51aff3a7dcc84eba52b8a/view',
  basis: 'official',
  note: 'Every bidding exercise since January 2010. Fetched live.',
};

/** Shown only if the live feed cannot be reached. */
export const COE_FALLBACK: Series[] = [
  {
    id: 'catA',
    label: 'Category A',
    unit: '$',
    points: [
      { date: '2020-01-01', value: 33001 },
      { date: '2021-01-01', value: 40889 },
      { date: '2022-01-01', value: 54001 },
      { date: '2023-01-01', value: 89000 },
      { date: '2024-01-01', value: 89000 },
      { date: '2025-01-01', value: 98124 },
      { date: '2026-08-01', value: 123890 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Pump prices
// ---------------------------------------------------------------------------

export const FUEL_SOURCE: HistorySource = {
  label: 'Posted pump prices — petrolprice.sg and Motorist, cross-checked',
  url: 'https://petrolprice.sg/',
  basis: 'indicative',
  note:
    'Singapore publishes no official pump-price feed. The latest point is a verified ' +
    'average of Esso, Shell, SPC, Caltex and Sinopec posted prices; earlier years are ' +
    'reference points and show the shape of the trend, not a price on any given day.',
};

/** Every price on this screen is the posted price, before card discounts. */
export const FUEL_BASIS = 'Posted pump price, before card and loyalty discounts';

export interface RetailerPrice {
  retailer: string;
  /** Null where that retailer does not sell the grade. */
  grades: { petrol92: number | null; petrol95: number | null; petrol98: number | null; diesel: number | null };
}

/**
 * A dated snapshot across the five major retailers.
 *
 * Not live: both price-comparison sites render their tables in the browser, so
 * there is nothing for a server to read. Rather than fake a live feed, this is
 * stamped with the date it was taken and cross-checked against two sources.
 */
export const FUEL_SNAPSHOT = {
  asOf: '29 August 2026',
  verifiedAgainst: ['petrolprice.sg', 'motorist.sg'],
  retailers: [
    { retailer: 'Esso', grades: { petrol92: 3.34, petrol95: 3.37, petrol98: 3.89, diesel: 3.95 } },
    { retailer: 'Shell', grades: { petrol92: null, petrol95: 3.37, petrol98: 3.89, diesel: 3.95 } },
    { retailer: 'SPC', grades: { petrol92: 3.34, petrol95: 3.36, petrol98: 3.88, diesel: 3.89 } },
    { retailer: 'Caltex', grades: { petrol92: 3.34, petrol95: 3.37, petrol98: null, diesel: 4.05 } },
    { retailer: 'Sinopec', grades: { petrol92: null, petrol95: 3.37, petrol98: 3.88, diesel: 3.89 } },
  ] as RetailerPrice[],
};

/**
 * Annual reference points for the posted pump price.
 *
 * The 2026 figures are the mean of the five retailers above. Earlier years are
 * indicative: they are drawn from published reporting rather than a continuous
 * series, and the card says so on screen.
 */
export const FUEL_SERIES: Series[] = [
  {
    id: 'petrol92',
    label: 'Petrol 92',
    unit: '$/L',
    points: [
      { date: '2020-01-01', value: 1.9 },
      { date: '2022-01-01', value: 2.94 },
      { date: '2024-01-01', value: 2.79 },
      { date: '2026-08-29', value: 3.34 },
    ],
  },
  {
    id: 'petrol95',
    label: 'Petrol 95',
    unit: '$/L',
    points: [
      { date: '2019-01-01', value: 2.18 },
      { date: '2020-01-01', value: 1.98 },
      { date: '2021-01-01', value: 2.35 },
      { date: '2022-01-01', value: 3.05 },
      { date: '2023-01-01', value: 2.92 },
      { date: '2024-01-01', value: 2.88 },
      { date: '2025-01-01', value: 2.9 },
      { date: '2026-08-29', value: 3.37 },
    ],
  },
  {
    id: 'petrol98',
    label: 'Petrol 98',
    unit: '$/L',
    points: [
      { date: '2019-01-01', value: 2.58 },
      { date: '2020-01-01', value: 2.36 },
      { date: '2021-01-01', value: 2.78 },
      { date: '2022-01-01', value: 3.55 },
      { date: '2023-01-01', value: 3.42 },
      { date: '2024-01-01', value: 3.38 },
      { date: '2025-01-01', value: 3.4 },
      { date: '2026-08-29', value: 3.89 },
    ],
  },
  {
    id: 'diesel',
    label: 'Diesel',
    unit: '$/L',
    points: [
      { date: '2019-01-01', value: 1.86 },
      { date: '2020-01-01', value: 1.62 },
      { date: '2021-01-01', value: 2.02 },
      { date: '2022-01-01', value: 3.12 },
      { date: '2023-01-01', value: 2.74 },
      { date: '2024-01-01', value: 2.66 },
      { date: '2025-01-01', value: 2.7 },
      { date: '2026-08-29', value: 3.95 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Parking
// ---------------------------------------------------------------------------

export const PARKING_SOURCE: HistorySource = {
  label: 'HDB and URA season parking charges',
  url: 'https://www.hdb.gov.sg/residential/car-parks',
  basis: 'official',
  note:
    'Public season parking rates change rarely: once in 2016, after fourteen years unchanged. ' +
    'Rates shown are for a resident’s first car, before GST.',
};

export const PARKING_SERIES: Series[] = [
  {
    id: 'hdbSurface',
    label: 'HDB surface',
    unit: '$/mth',
    points: [
      { date: '2002-01-01', value: 65 },
      { date: '2016-12-01', value: 80 },
      { date: '2026-08-01', value: 80 },
    ],
  },
  {
    id: 'hdbSheltered',
    label: 'HDB sheltered',
    unit: '$/mth',
    points: [
      { date: '2002-01-01', value: 90 },
      { date: '2016-12-01', value: 110 },
      { date: '2026-08-01', value: 110 },
    ],
  },
  {
    id: 'ura',
    label: 'URA (general)',
    unit: '$/mth',
    points: [
      { date: '2002-01-01', value: 65 },
      { date: '2016-12-01', value: 90 },
      { date: '2026-08-01', value: 90 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Typical running-cost rates
// ---------------------------------------------------------------------------

export interface RateBand {
  label: string;
  /** Typical low and high of the going rate. */
  low: number;
  high: number;
  unit: string;
  note: string;
}

export interface RateGroup {
  id: string;
  title: string;
  /** What this maps to on the calculator screen. */
  appliesTo: string;
  source: HistorySource;
  bands: RateBand[];
}

const MARKET_SOURCE: HistorySource = {
  label: 'Singapore workshop, grooming and insurer advertised rates',
  url: 'https://www.moneysmart.sg/personal-loan/car-ownership-singapore-cost-loans-ms',
  basis: 'indicative',
  note:
    'Typical advertised ranges, not a survey. Your own quote is the only number that ' +
    'matters — these exist so you can tell whether one looks reasonable.',
};

/** Five bands per group: enough to place a quote, few enough to read at a glance. */
export const RATE_GROUPS: RateGroup[] = [
  {
    id: 'maintenance',
    title: 'Servicing and maintenance',
    appliesTo: 'Maintenance and servicing',
    source: MARKET_SOURCE,
    bands: [
      { label: 'Basic oil service, third-party workshop', low: 120, high: 220, unit: 'per visit', note: 'Every 10,000 km or so.' },
      { label: 'Major service, third-party workshop', low: 350, high: 700, unit: 'per visit', note: 'Plugs, filters, fluids.' },
      { label: 'Authorised dealer servicing', low: 500, high: 1_200, unit: 'per visit', note: 'Continental marques sit at the top.' },
      { label: 'Tyres, a full set', low: 500, high: 1_400, unit: 'per set', note: 'Every 40,000-60,000 km.' },
      { label: 'Brake pads and discs', low: 300, high: 900, unit: 'per axle', note: 'Continental parts cost more.' },
    ],
  },
  {
    id: 'cleaning',
    title: 'Washing and grooming',
    appliesTo: 'Washing',
    source: MARKET_SOURCE,
    bands: [
      { label: 'Petrol station automatic wash', low: 8, high: 15, unit: 'per wash', note: 'Often bundled with fuel spend.' },
      { label: 'Hand wash', low: 15, high: 30, unit: 'per wash', note: 'Exterior and a quick interior wipe.' },
      { label: 'Wash and interior vacuum', low: 30, high: 60, unit: 'per visit', note: 'Monthly for most owners.' },
      { label: 'Polish and wax', low: 80, high: 200, unit: 'per session', note: 'A couple of times a year.' },
      { label: 'Full grooming or coating', low: 400, high: 1_500, unit: 'one-off', note: 'Ceramic coating lasts a few years.' },
    ],
  },
  {
    id: 'insurance',
    title: 'Insurance',
    appliesTo: 'Insurance',
    source: MARKET_SOURCE,
    bands: [
      { label: 'Third-party only', low: 700, high: 1_200, unit: 'per year', note: 'Rarely worth it on a financed car.' },
      { label: 'Comprehensive, experienced driver, max NCD', low: 900, high: 1_600, unit: 'per year', note: '50% no-claim discount.' },
      { label: 'Comprehensive, mainstream car', low: 1_400, high: 2_400, unit: 'per year', note: 'The usual case.' },
      { label: 'Comprehensive, continental or performance', low: 2_200, high: 4_500, unit: 'per year', note: 'Higher repair costs.' },
      { label: 'Young or newly licensed driver', low: 3_000, high: 7_000, unit: 'per year', note: 'Under 27, or licensed under 2 years.' },
    ],
  },
];
