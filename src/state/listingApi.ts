import { Platform } from 'react-native';
import type { ParsedListing } from '../core/listing';

/**
 * Client for the listing fetcher.
 *
 * On web the API is same-origin, so a relative path is enough. Native builds
 * have no origin of their own and must call the deployed function, which is why
 * the base URL is overridable through EXPO_PUBLIC_API_BASE.
 */
const DEFAULT_NATIVE_BASE = 'https://oyc-jade.vercel.app';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? (Platform.OS === 'web' ? '' : DEFAULT_NATIVE_BASE);

export class ListingError extends Error {
  detail?: string;
  constructor(message: string, detail?: string) {
    super(message);
    this.name = 'ListingError';
    this.detail = detail;
  }
}

export async function fetchListing(url: string, signal?: AbortSignal): Promise<ParsedListing> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/listing?url=${encodeURIComponent(url)}`, { signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ListingError(
      'Could not reach OYC.',
      'Check your connection and try again.',
    );
  }

  let body: { listing?: ParsedListing; error?: string; detail?: string } = {};
  try {
    body = await response.json();
  } catch {
    throw new ListingError('OYC sent back something unreadable.', 'Try again in a moment.');
  }

  if (!response.ok || !body.listing) {
    throw new ListingError(body.error ?? 'Could not read that listing.', body.detail);
  }

  return body.listing;
}
