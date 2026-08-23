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

/** Listings top out well below this; probing stops at the first gap anyway. */
const MAX_GALLERY = 14;
const PROBE_TIMEOUT_MS = 4_000;

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

/**
 * Finds the rest of the gallery.
 *
 * The page's payload only advertises a couple of images, but the CDN holds the
 * full set under a predictable name. Probing for them is what turns a single
 * thumbnail into something you can actually spin through, and it costs one
 * round of parallel HEAD requests.
 */
async function expandGallery(found: string[], listingId: string | null): Promise<string[]> {
  const seed = found[0];
  if (!seed || !listingId) return found;

  const match = new RegExp(`^(.*/)${listingId}_[0-9a-z]+\\.(jpe?g|png|webp)$`, 'i').exec(seed);
  if (!match) return found;

  const [, directory, extension] = match;
  const candidates = [
    `${directory}${listingId}_1.${extension}`,
    ...Array.from({ length: MAX_GALLERY }, (_, i) => `${directory}${listingId}_${i + 1}b.${extension}`),
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const results = await Promise.all(
      candidates.map(async (url) => {
        try {
          const head = await fetch(url, {
            method: 'HEAD',
            headers: BROWSER_HEADERS,
            signal: controller.signal,
          });
          return head.ok ? url : null;
        } catch {
          return null;
        }
      }),
    );

    const live = results.filter((url): url is string => url !== null);
    // Prefer the gallery images; the bare _1 is a small thumbnail.
    const gallery = live.filter((url) => /_\d+b\./i.test(url));
    return (gallery.length > 0 ? gallery : live.length > 0 ? live : found).sort(byGalleryIndex);
  } catch {
    return found;
  } finally {
    clearTimeout(timeout);
  }
}

function byGalleryIndex(a: string, b: string): number {
  const index = (url: string) => Number(/_(\d+)b?\./i.exec(url)?.[1] ?? 0);
  return index(a) - index(b);
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
    listing.photos = await expandGallery(listing.photos, listing.listingId);

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
