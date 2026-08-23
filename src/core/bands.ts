/**
 * The headline verdict scale: what share of your gross monthly income the car
 * eats, expressed in four words a person can act on.
 *
 * Deliberately separate from the 20-4-10 / OYC rule machinery in verdict.ts.
 * Those rules answer "does this pass a checklist"; this answers "what do I call
 * this number", and it is what the app flashes at you.
 */

export type BandId = 'comfortable' | 'affordable' | 'barely' | 'tooExpensive';

export type BandTone = 'pass' | 'stretch' | 'fail';

export interface BandDef {
  id: BandId;
  label: string;
  /** Upper bound of the band as a share of gross monthly income; null = open-ended. */
  maxShare: number | null;
  tone: BandTone;
  blurb: string;
}

/** Anything at or above this is called out as severe, inside the worst band. */
export const SEVERE_SHARE = 0.4;

export const BAND_ORDER: BandDef[] = [
  {
    id: 'comfortable',
    label: 'Comfortable',
    maxShare: 0.1,
    tone: 'pass',
    blurb: 'Under a tenth of your income. The car will not shape the rest of your life.',
  },
  {
    id: 'affordable',
    label: 'Affordable',
    maxShare: 0.2,
    tone: 'pass',
    blurb: 'A real cost, but one your income absorbs without much strain.',
  },
  {
    id: 'barely',
    label: 'Barely affordable',
    maxShare: 0.3,
    tone: 'stretch',
    blurb: 'Close to a third of everything you earn. Savings and holidays pay for this car.',
  },
  {
    id: 'tooExpensive',
    label: 'Too expensive',
    maxShare: null,
    tone: 'fail',
    blurb: 'Past the point where the car is a purchase. It becomes the budget.',
  },
];

export interface BandResult extends BandDef {
  share: number;
  /** True at 40% of income and above. */
  severe: boolean;
}

/** Classify a cost-to-income share. Missing or nonsensical income lands in the worst band. */
export function classifyBand(share: number): BandResult {
  const worst = BAND_ORDER[BAND_ORDER.length - 1];
  if (!Number.isFinite(share) || share < 0) {
    return { ...worst, share, severe: true };
  }
  const band = BAND_ORDER.find((b) => b.maxShare !== null && share < b.maxShare) ?? worst;
  return { ...band, share, severe: share >= SEVERE_SHARE };
}

/**
 * Gross monthly income that would put this cost inside the given band.
 * Returns null for the open-ended worst band, which has no ceiling to hit.
 */
export function incomeNeededForBand(monthlyCost: number, bandId: BandId): number | null {
  const band = BAND_ORDER.find((b) => b.id === bandId);
  if (!band || band.maxShare === null) return null;
  return monthlyCost / band.maxShare;
}

export function bandById(id: BandId): BandDef {
  return BAND_ORDER.find((b) => b.id === id) ?? BAND_ORDER[BAND_ORDER.length - 1];
}
