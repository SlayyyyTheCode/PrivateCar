import { COE_DATASET_ID, type TimePoint } from '../src/data/history';

/**
 * COE bidding results, proxied from LTA's dataset on data.gov.sg.
 *
 * Same reason as the listing fetcher: no CORS headers upstream, so a browser
 * cannot read it directly. Stateless, no keys. The response is cached hard —
 * the data only changes twice a month.
 */

export const config = { runtime: 'edge' };

const UPSTREAM = 'https://data.gov.sg/api/action/datastore_search';
const TIMEOUT_MS = 12_000;
/** Two exercises a month since 2010 across five categories — this covers all of it. */
const PAGE_SIZE = 5_000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-08" becomes "Aug 2026". */
function monthName(month: string): string {
  const [year, index] = month.split('-');
  return `${MONTHS[Number(index) - 1] ?? month} ${year}`;
}

interface Record {
  month?: string;
  bidding_no?: string;
  vehicle_class?: string;
  premium?: string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Bidding closes twice a month; an hour at the edge is conservative.
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default async function handler(): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${UPSTREAM}?resource_id=${COE_DATASET_ID}&limit=${PAGE_SIZE}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return json({ error: `data.gov.sg returned ${response.status}.` }, 502);
    }

    const body = (await response.json()) as { result?: { records?: Record[] } };
    const records = body.result?.records ?? [];

    if (records.length === 0) {
      return json({ error: 'The COE dataset came back empty.' }, 502);
    }

    // Reshape into the series the chart wants, so the client does no parsing.
    const byClass = new Map<string, TimePoint[]>();

    for (const record of records) {
      const month = record.month;
      const premium = Number(record.premium);
      const category = record.vehicle_class;
      if (!month || !category || !Number.isFinite(premium) || premium <= 0) continue;

      const list = byClass.get(category) ?? [];

      // The dataset gives the month and the round, never the closing day —
      // exercises close on varying Wednesdays. The day here orders the two
      // rounds within a month and nothing more, so the point carries a label
      // saying which exercise it was rather than asserting a date that would
      // be wrong.
      const second = record.bidding_no === '2';
      list.push({
        date: `${month}-${second ? '16' : '01'}`,
        value: premium,
        label: `${monthName(month)} · ${second ? '2nd' : '1st'} exercise`,
      });
      byClass.set(category, list);
    }

    const series = Array.from(byClass.entries())
      .map(([label, points]) => ({
        id: label.replace(/\s+/g, '').toLowerCase(),
        label,
        unit: '$',
        points: points.sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return json({ series, records: records.length }, 200);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return json(
      {
        error: aborted ? 'data.gov.sg took too long to respond.' : 'Could not reach data.gov.sg.',
      },
      504,
    );
  } finally {
    clearTimeout(timeout);
  }
}
