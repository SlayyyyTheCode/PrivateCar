import { ARF_TIERS } from '../data/sg-2026-08';

export interface ArfBreakdownRow {
  /** Human-readable band, e.g. "$20,001 – $40,000". */
  label: string;
  rate: number;
  /** Portion of the OMV that falls inside this band. */
  omvInBand: number;
  /** Fee contributed by this band. */
  fee: number;
}

function formatBand(from: number, to: number | null): string {
  const start = from === 0 ? 'First $20,000' : `$${(from + 1).toLocaleString()}`;
  if (from === 0) return start;
  return to === null ? `Above $${from.toLocaleString()}` : `${start} – $${to.toLocaleString()}`;
}

/**
 * Additional Registration Fee, charged on the car's Open Market Value.
 *
 * The tiers are marginal: only the slice of OMV falling inside a band is taxed
 * at that band's rate. This is the single biggest reason a $30,000 OMV car ends
 * up costing well over $150,000 on the road.
 */
export function calculateArf(omv: number): number {
  return arfBreakdown(omv).reduce((total, row) => total + row.fee, 0);
}

export function arfBreakdown(omv: number): ArfBreakdownRow[] {
  if (omv <= 0) return [];

  const rows: ArfBreakdownRow[] = [];
  for (const tier of ARF_TIERS) {
    if (omv <= tier.from) break;
    const ceiling = tier.to ?? omv;
    const omvInBand = Math.min(omv, ceiling) - tier.from;
    rows.push({
      label: formatBand(tier.from, tier.to),
      rate: tier.rate,
      omvInBand,
      fee: omvInBand * tier.rate,
    });
  }
  return rows;
}
