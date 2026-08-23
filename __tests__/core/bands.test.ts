import { describe, expect, it } from 'vitest';
import { classifyBand, incomeNeededForBand, BAND_ORDER } from '../../src/core/bands';

describe('classifyBand', () => {
  it('calls anything under 10% of income comfortable', () => {
    expect(classifyBand(0.05).id).toBe('comfortable');
    expect(classifyBand(0.0999).id).toBe('comfortable');
  });

  it('calls 10% to 20% affordable', () => {
    expect(classifyBand(0.1).id).toBe('affordable');
    expect(classifyBand(0.1999).id).toBe('affordable');
  });

  it('calls 20% to 30% barely affordable', () => {
    expect(classifyBand(0.2).id).toBe('barely');
    expect(classifyBand(0.2999).id).toBe('barely');
  });

  it('calls 30% and above too expensive', () => {
    expect(classifyBand(0.3).id).toBe('tooExpensive');
    expect(classifyBand(0.55).id).toBe('tooExpensive');
  });

  it('flags 40% and above as severe, but still in the same band', () => {
    expect(classifyBand(0.35).severe).toBe(false);
    expect(classifyBand(0.4).severe).toBe(true);
    expect(classifyBand(0.9).id).toBe('tooExpensive');
  });

  it('falls back to the worst band when income is missing', () => {
    expect(classifyBand(Infinity).id).toBe('tooExpensive');
    expect(classifyBand(Number.NaN).id).toBe('tooExpensive');
  });

  it('treats a free car as comfortable', () => {
    expect(classifyBand(0).id).toBe('comfortable');
  });

  it('gives every band a label and a tone', () => {
    for (const band of BAND_ORDER) {
      const result = classifyBand(band.maxShare === null ? 0.5 : band.maxShare - 0.001);
      expect(result.label.length).toBeGreaterThan(0);
      expect(['pass', 'stretch', 'fail']).toContain(result.tone);
    }
  });
});

describe('incomeNeededForBand', () => {
  it('says what you would need to earn to reach a band', () => {
    // $3,000/month at the 20% affordable ceiling
    expect(incomeNeededForBand(3_000, 'affordable')).toBeCloseTo(15_000, 6);
    // ...and at the 10% comfortable ceiling
    expect(incomeNeededForBand(3_000, 'comfortable')).toBeCloseTo(30_000, 6);
  });

  it('has no answer for the worst band, which has no ceiling', () => {
    expect(incomeNeededForBand(3_000, 'tooExpensive')).toBeNull();
  });
});
