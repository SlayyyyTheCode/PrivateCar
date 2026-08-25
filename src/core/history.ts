import type { Series, TimePoint } from '../data/history';

/**
 * Time-series helpers for the trends screen.
 *
 * Pure and date-string based: the COE feed reports months as "2026-08" and
 * bundled series use ISO dates, so everything is compared lexicographically
 * rather than through Date objects. That also keeps the tests free of any
 * dependency on the clock or the machine's timezone.
 */

export type Granularity = 'day' | 'month' | 'year';

export interface RangePreset {
  id: string;
  label: string;
  /** Years back from the latest point. Null means everything. */
  years: number | null;
  granularity: Granularity;
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: '1y', label: '1 year', years: 1, granularity: 'day' },
  { id: '3y', label: '3 years', years: 3, granularity: 'month' },
  { id: '5y', label: '5 years', years: 5, granularity: 'month' },
  { id: '10y', label: '10 years', years: 10, granularity: 'year' },
  { id: 'all', label: 'All', years: null, granularity: 'year' },
];

/** Normalises "2026-08" or "2026-08-19" to a full ISO date. */
export function normaliseDate(date: string): string {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  return trimmed;
}

/** The key a point collapses to at the given granularity. */
export function bucketKey(date: string, granularity: Granularity): string {
  const iso = normaliseDate(date);
  if (granularity === 'year') return iso.slice(0, 4);
  if (granularity === 'month') return iso.slice(0, 7);
  return iso.slice(0, 10);
}

/** Latest date across every series, as the anchor for relative ranges. */
export function latestDate(series: Series[]): string | null {
  let latest: string | null = null;
  for (const entry of series) {
    for (const point of entry.points) {
      const iso = normaliseDate(point.date);
      if (latest === null || iso > latest) latest = iso;
    }
  }
  return latest;
}

/** The inclusive start date for a preset, or null when it covers everything. */
export function rangeStart(preset: RangePreset, anchor: string | null): string | null {
  if (preset.years === null || anchor === null) return null;
  const year = Number(anchor.slice(0, 4)) - preset.years;
  return `${year}${anchor.slice(4, 10)}`;
}

/**
 * Collapses a series to one point per bucket, averaging within each.
 *
 * COE runs two bidding exercises a month and pump prices move constantly, so
 * plotting raw points over a decade is noise. Averaging is the honest summary:
 * it is what "the price that year" means.
 */
export function aggregate(points: TimePoint[], granularity: Granularity): TimePoint[] {
  const buckets = new Map<string, { total: number; count: number }>();

  for (const point of points) {
    if (!Number.isFinite(point.value)) continue;
    const key = bucketKey(point.date, granularity);
    const bucket = buckets.get(key) ?? { total: 0, count: 0 };
    bucket.total += point.value;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .map(([key, bucket]) => ({ date: normaliseDate(key), value: bucket.total / bucket.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function filterFrom(points: TimePoint[], start: string | null): TimePoint[] {
  if (start === null) return [...points].sort((a, b) => normaliseDate(a.date).localeCompare(normaliseDate(b.date)));
  return points
    .filter((point) => normaliseDate(point.date) >= start)
    .sort((a, b) => normaliseDate(a.date).localeCompare(normaliseDate(b.date)));
}

/** Everything the header above a chart needs. */
export interface SeriesSummary {
  first: TimePoint | null;
  latest: TimePoint | null;
  min: TimePoint | null;
  max: TimePoint | null;
  /** Absolute and proportional change across the visible window. */
  change: number;
  changePct: number;
}

export function summarise(points: TimePoint[]): SeriesSummary {
  if (points.length === 0) {
    return { first: null, latest: null, min: null, max: null, change: 0, changePct: 0 };
  }

  const sorted = [...points].sort((a, b) => normaliseDate(a.date).localeCompare(normaliseDate(b.date)));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  let min = first;
  let max = first;
  for (const point of sorted) {
    if (point.value < min.value) min = point;
    if (point.value > max.value) max = point;
  }

  const change = latest.value - first.value;
  return {
    first,
    latest,
    min,
    max,
    change,
    changePct: first.value === 0 ? 0 : change / first.value,
  };
}

/** Prepares a set of series for one chart: filtered, aggregated, sorted. */
export function prepare(series: Series[], preset: RangePreset): Series[] {
  const start = rangeStart(preset, latestDate(series));
  return series.map((entry) => ({
    ...entry,
    points: aggregate(filterFrom(entry.points, start), preset.granularity),
  }));
}

/** Shared y-range across series so they can share one axis. */
export function valueExtent(series: Series[]): { min: number; max: number } {
  const values = series.flatMap((entry) => entry.points.map((point) => point.value));
  if (values.length === 0) return { min: 0, max: 1 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min * 0.95, max: max * 1.05 || 1 };

  // A little headroom so the line never runs along the frame.
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}
