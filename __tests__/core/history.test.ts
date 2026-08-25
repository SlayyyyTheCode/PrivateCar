import { describe, expect, it } from 'vitest';
import {
  RANGE_PRESETS,
  aggregate,
  bucketKey,
  filterFrom,
  latestDate,
  normaliseDate,
  prepare,
  rangeStart,
  summarise,
  valueExtent,
} from '../../src/core/history';
import type { Series, TimePoint } from '../../src/data/history';

const points = (entries: [string, number][]): TimePoint[] =>
  entries.map(([date, value]) => ({ date, value }));

describe('normaliseDate', () => {
  it('expands the partial dates the COE feed uses', () => {
    // data.gov.sg reports a bidding month as "2026-08".
    expect(normaliseDate('2026-08')).toBe('2026-08-01');
    expect(normaliseDate('2026')).toBe('2026-01-01');
    expect(normaliseDate('2026-08-19')).toBe('2026-08-19');
  });
});

describe('bucketKey', () => {
  it('collapses to the requested granularity', () => {
    expect(bucketKey('2026-08-19', 'day')).toBe('2026-08-19');
    expect(bucketKey('2026-08-19', 'month')).toBe('2026-08');
    expect(bucketKey('2026-08-19', 'year')).toBe('2026');
  });

  it('works on the feed’s partial dates too', () => {
    expect(bucketKey('2026-08', 'month')).toBe('2026-08');
    expect(bucketKey('2026-08', 'year')).toBe('2026');
  });
});

describe('aggregate', () => {
  it('averages the two bidding exercises in a month', () => {
    const result = aggregate(points([['2026-08-01', 100], ['2026-08-19', 120]]), 'month');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: '2026-08-01', value: 110 });
  });

  it('averages across a year', () => {
    const result = aggregate(points([['2025-01-01', 90], ['2025-07-01', 110], ['2026-01-01', 200]]), 'year');
    expect(result).toEqual([
      { date: '2025-01-01', value: 100 },
      { date: '2026-01-01', value: 200 },
    ]);
  });

  it('returns points in date order regardless of input order', () => {
    const result = aggregate(points([['2026-01-01', 5], ['2024-01-01', 1], ['2025-01-01', 3]]), 'year');
    expect(result.map((p) => p.date)).toEqual(['2024-01-01', '2025-01-01', '2026-01-01']);
  });

  it('skips values that are not numbers rather than poisoning the average', () => {
    const result = aggregate(
      [
        { date: '2026-01-01', value: 100 },
        { date: '2026-02-01', value: Number.NaN },
      ],
      'year',
    );
    expect(result[0].value).toBe(100);
  });

  it('has nothing to say about an empty series', () => {
    expect(aggregate([], 'year')).toEqual([]);
  });
});

describe('filterFrom and rangeStart', () => {
  const series: Series[] = [
    { id: 'a', label: 'A', unit: '$', points: points([['2016-01-01', 1], ['2026-08-01', 2]]) },
  ];

  it('finds the latest date across every series', () => {
    expect(latestDate(series)).toBe('2026-08-01');
    expect(latestDate([])).toBeNull();
  });

  it('counts a range back from the latest point, not from today', () => {
    // Anchoring on the data keeps the view stable regardless of when it is run.
    const fiveYears = RANGE_PRESETS.find((preset) => preset.id === '5y')!;
    expect(rangeStart(fiveYears, '2026-08-01')).toBe('2021-08-01');
  });

  it('has no start date for the full range', () => {
    const all = RANGE_PRESETS.find((preset) => preset.id === 'all')!;
    expect(rangeStart(all, '2026-08-01')).toBeNull();
  });

  it('keeps only points at or after the start', () => {
    const filtered = filterFrom(series[0].points, '2020-01-01');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].date).toBe('2026-08-01');
  });

  it('sorts when there is no start date', () => {
    const filtered = filterFrom(points([['2026-01-01', 2], ['2020-01-01', 1]]), null);
    expect(filtered.map((p) => p.date)).toEqual(['2020-01-01', '2026-01-01']);
  });
});

describe('summarise', () => {
  it('reports the span, the extremes and the change across it', () => {
    const result = summarise(points([['2020-01-01', 50], ['2022-01-01', 20], ['2026-01-01', 100]]));
    expect(result.first?.value).toBe(50);
    expect(result.latest?.value).toBe(100);
    expect(result.min?.value).toBe(20);
    expect(result.max?.value).toBe(100);
    expect(result.change).toBe(50);
    expect(result.changePct).toBeCloseTo(1, 6);
  });

  it('handles a fall as readily as a rise', () => {
    const result = summarise(points([['2020-01-01', 200], ['2026-01-01', 150]]));
    expect(result.change).toBe(-50);
    expect(result.changePct).toBeCloseTo(-0.25, 6);
  });

  it('does not divide by zero', () => {
    expect(summarise(points([['2020-01-01', 0], ['2026-01-01', 10]])).changePct).toBe(0);
  });

  it('is empty for an empty series', () => {
    expect(summarise([]).latest).toBeNull();
  });
});

describe('valueExtent', () => {
  it('spans every series so they can share one axis', () => {
    const extent = valueExtent([
      { id: 'a', label: 'A', unit: '$', points: points([['2020-01-01', 10]]) },
      { id: 'b', label: 'B', unit: '$', points: points([['2020-01-01', 90]]) },
    ]);
    expect(extent.min).toBeLessThan(10);
    expect(extent.max).toBeGreaterThan(90);
  });

  it('opens out a flat series instead of collapsing it to a line of zero height', () => {
    const extent = valueExtent([
      { id: 'a', label: 'A', unit: '$', points: points([['2020-01-01', 80], ['2026-01-01', 80]]) },
    ]);
    expect(extent.max).toBeGreaterThan(extent.min);
  });

  it('falls back to a usable range with no data at all', () => {
    expect(valueExtent([])).toEqual({ min: 0, max: 1 });
  });
});

describe('prepare', () => {
  const series: Series[] = [
    {
      id: 'coe',
      label: 'Cat A',
      unit: '$',
      points: points([
        ['2016-01', 50_000],
        ['2024-01', 80_000],
        ['2024-07', 90_000],
        ['2026-08', 123_890],
      ]),
    },
  ];

  it('filters then aggregates to the preset’s granularity', () => {
    const threeYears = RANGE_PRESETS.find((preset) => preset.id === '3y')!;
    const [prepared] = prepare(series, threeYears);
    // 2016 falls outside a three-year window anchored on 2026-08.
    expect(prepared.points.map((p) => p.date)).toEqual(['2024-01-01', '2024-07-01', '2026-08-01']);
  });

  it('averages within the year on the ten-year view', () => {
    const tenYears = RANGE_PRESETS.find((preset) => preset.id === '10y')!;
    const [prepared] = prepare(series, tenYears);
    const year2024 = prepared.points.find((p) => p.date.startsWith('2024'));
    expect(year2024?.value).toBe(85_000);
  });

  it('keeps the series label and unit', () => {
    const [prepared] = prepare(series, RANGE_PRESETS[0]);
    expect(prepared.label).toBe('Cat A');
    expect(prepared.unit).toBe('$');
  });
});
