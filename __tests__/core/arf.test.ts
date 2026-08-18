import { describe, expect, it } from 'vitest';
import { calculateArf, arfBreakdown } from '../../src/core/arf';

describe('calculateArf', () => {
  it('charges 100% on the first $20,000 of OMV', () => {
    expect(calculateArf(20_000)).toBe(20_000);
    expect(calculateArf(15_000)).toBe(15_000);
  });

  it('matches the SingSaver worked example: OMV $100,000 gives ARF $200,000', () => {
    // 20,000 + 28,000 + 38,000 + 50,000 + 64,000
    expect(calculateArf(100_000)).toBe(200_000);
  });

  it('applies each tier marginally rather than to the whole OMV', () => {
    // 20,000 @ 100% + 10,000 @ 140%
    expect(calculateArf(30_000)).toBe(34_000);
    // ...through to the top of the 190% band
    expect(calculateArf(60_000)).toBe(86_000);
  });

  it('handles a real mass-market OMV (Toyota Sienta Hybrid, $27,706)', () => {
    // 20,000 + 7,706 * 1.4
    expect(calculateArf(27_706)).toBeCloseTo(30_788.4, 2);
  });

  it('returns zero for a zero or negative OMV', () => {
    expect(calculateArf(0)).toBe(0);
    expect(calculateArf(-5_000)).toBe(0);
  });
});

describe('arfBreakdown', () => {
  it('only reports the tiers that actually apply', () => {
    const rows = arfBreakdown(30_000);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ rate: 1.0, omvInBand: 20_000, fee: 20_000 });
    expect(rows[1]).toMatchObject({ rate: 1.4, omvInBand: 10_000, fee: 14_000 });
  });

  it('sums to the same total as calculateArf', () => {
    const total = arfBreakdown(137_500).reduce((sum, row) => sum + row.fee, 0);
    expect(total).toBeCloseTo(calculateArf(137_500), 6);
  });
});
