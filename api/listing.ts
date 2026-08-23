import { isSupportedListingUrl, parseListing } from '../src/core/listing';

/**
 * Fetches a car listing and returns it parsed.
 *
 * This exists for one reason: listing sites send no CORS headers, so a browser
 * cannot read them directly. The function is stateless — it stores nothing,
 * needs no account, and holds no keys. Everything it knows about parsing lives
 * in src/core/listing.ts, which is unit tested against a captured page.
 */

export const config = { runtime: 'edge' };

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 4_000_000;

// Listing sites reject obviously automated clients outright.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-SG,en;q=0.9',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Same listing is often pasted twice; a short cache spares the source site.
      'Cache-Control': 's-maxage=600, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const target = new URL(request.url).searchParams.get('url')?.trim() ?? '';

  if (!target) {
    return json({ error: 'Add a ?url= parameter pointing at a car listing.' }, 400);
  }

  // Only ever fetch listing sites we understand — this endpoint must not become
  // an open proxy for arbitrary URLs.
  if (!isSupportedListingUrl(target)) {
    return json(
      {
        error: 'That link is not a supported car listing.',
        detail: 'OYC currently reads sgcarmart.com listings. Paste the link to a specific car.',
      },
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(target, { headers: BROWSER_HEADERS, signal: controller.signal });

    if (!response.ok) {
      return json(
        {
          error: `The listing site returned ${response.status}.`,
          detail: 'It may have removed the listing, or be blocking automated requests right now.',
        },
        502,
      );
    }

    const html = (await response.text()).slice(0, MAX_BYTES);
    const listing = parseListing(html, target);

    // Nothing usable came back — better to say so than to show invented figures.
    if (listing.price === null && listing.omv === null) {
      return json(
        {
          error: 'Could not read that page.',
          detail: 'The listing layout may have changed. Enter the numbers manually instead.',
          listing,
        },
        422,
      );
    }

    return json({ listing }, 200);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return json(
      {
        error: aborted ? 'The listing site took too long to respond.' : 'Could not reach the listing site.',
        detail: aborted ? 'Try again in a moment.' : String(error instanceof Error ? error.message : error),
      },
      504,
    );
  } finally {
    clearTimeout(timeout);
  }
}
