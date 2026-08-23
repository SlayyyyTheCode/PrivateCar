import { COE } from '../data/sg-2026-08';
import type { FuelType, Scenario } from './types';

/**
 * Parses a Singapore used-car listing into something the affordability engine
 * can evaluate.
 *
 * The page ships its data twice: once as an escaped JSON payload inside a
 * script tag, and once as rendered markup. We read the JSON first because it is
 * structured and labelled, fall back to the visible label/value pairs, and fall
 * back again to plain rendered text. Listing sites change without warning, so
 * every field is optional and anything unparsed is reported in `missing` rather
 * than guessed at.
 *
 * Pure string-in / object-out: the same function runs in the serverless fetcher
 * and in the unit tests, pinned against a real captured page.
 */

export type BodyShape = 'sedan' | 'suv' | 'hatchback' | 'mpv' | 'wagon' | 'coupe';

export interface ParsedListing {
  sourceUrl: string;
  listingId: string | null;
  title: string | null;
  price: number | null;
  monthlyInstalmentQuoted: number | null;
  depreciationPerYear: number | null;
  registrationDate: string | null;
  coeMonthsRemaining: number | null;
  mileageKm: number | null;
  roadTaxAnnual: number | null;
  deregValue: number | null;
  omv: number | null;
  coe: number | null;
  arf: number | null;
  engineCc: number | null;
  powerKw: number | null;
  curbWeightKg: number | null;
  owners: number | null;
  vehicleType: string | null;
  fuelType: FuelType;
  bodyShape: BodyShape;
  photos: string[];
  /** Fields the parser could not find. Surfaced in the UI so the user can fill them in. */
  missing: string[];
}

/** Money outside this range is markup noise, not a real figure. */
const MAX_PLAUSIBLE_AMOUNT = 5_000_000;

/**
 * Prices, OMV, ARF and COE are all five figures or more in Singapore. Requiring
 * a floor stops the parser reporting a stray "7" from an unrelated part of the
 * page as an asking price.
 */
const MIN_PLAUSIBLE_PRICE = 1_000;

export function isSupportedListingUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url.trim());
    return /(^|\.)sgcarmart\.com$/i.test(hostname) && pathname.length > 1;
  } catch {
    return false;
  }
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => named[String(name).toLowerCase()] ?? whole);
}

/** Strips markup down to rendered text, for the last-resort fallback. */
function toText(html: string): string {
  const withoutCode = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return decodeEntities(withoutCode.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Numbers arrive as "$$58,300", "1,984 cc" or "140.0 kW (187 bhp)". */
function firstNumber(raw: string | null): number | null {
  if (raw === null) return null;
  const match = /(\d[\d,]*(?:\.\d+)?)/.exec(raw);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function asMoney(raw: string | null, min = 0): number | null {
  const value = firstNumber(raw);
  if (value === null || value <= 0 || value < min || value > MAX_PLAUSIBLE_AMOUNT) return null;
  return value;
}

/** Reads `"key":"value"` out of the embedded JSON payload. */
function jsonValue(payload: string, key: string): string | null {
  const match = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i').exec(payload);
  if (match) return decodeEntities(match[1]);
  const numeric = new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i').exec(payload);
  return numeric ? numeric[1] : null;
}

/** Reads the `"<label>",...,"desc":"<value>"` pairs the spec table is built from. */
function labelledValue(payload: string, label: string): string | null {
  const match = new RegExp(`"${label}"[^{}]{0,120}?"desc"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i').exec(payload);
  return match ? decodeEntities(match[1]) : null;
}

/** Rendered-text fallback: `Label $12,345` or `Label 1,984 cc`. */
function textValue(text: string, label: string): string | null {
  const match = new RegExp(`${label}\\s*:?\\s*\\$?\\$?\\s*([\\d,.]+)`, 'i').exec(text);
  return match ? match[1] : null;
}

/** "2yrs 4mths 4days COE left" becomes 28 months. */
function parseCoeRemaining(raw: string | null): number | null {
  if (!raw) return null;
  const match = /(?:(\d+)\s*yrs?)?\s*(?:(\d+)\s*mths?)?/i.exec(raw);
  if (!match || (!match[1] && !match[2])) return null;
  const months = Number(match[1] ?? 0) * 12 + Number(match[2] ?? 0);
  return months > 0 && months <= COE.validityMonths ? months : null;
}

const BODY_SHAPES: { pattern: RegExp; shape: BodyShape }[] = [
  { pattern: /suv|4x4|crossover/i, shape: 'suv' },
  { pattern: /hatchback/i, shape: 'hatchback' },
  { pattern: /mpv|van|people/i, shape: 'mpv' },
  { pattern: /wagon|estate/i, shape: 'wagon' },
  { pattern: /coupe|convertible|roadster|sports/i, shape: 'coupe' },
  { pattern: /sedan|saloon|luxury/i, shape: 'sedan' },
];

function inferBodyShape(vehicleType: string | null, title: string | null): BodyShape {
  const haystack = `${vehicleType ?? ''} ${title ?? ''}`;
  return BODY_SHAPES.find((entry) => entry.pattern.test(haystack))?.shape ?? 'sedan';
}

function fuelTypeIn(text: string): FuelType | null {
  if (/\belectric\b|\bkwh\b/i.test(text)) return 'ev';
  if (/hybrid/i.test(text)) return 'hybrid';
  if (/diesel/i.test(text)) return 'diesel';
  if (/petrol|gasoline/i.test(text)) return 'petrol';
  return null;
}

/**
 * A declared fuel type wins outright. Scanning the whole page is a last resort:
 * listing pages carry "Electric Cars" navigation links and an `electric_info`
 * key on every car, which would label a petrol saloon an EV and then bill it
 * for EV road tax.
 */
function inferFuelType(declared: string | null, text: string): FuelType {
  if (declared) return fuelTypeIn(declared) ?? 'petrol';
  return fuelTypeIn(text) ?? 'petrol';
}

function parseListingId(url: string): string | null {
  const match = /-(\d{5,})(?:[/?#]|$)/.exec(url);
  return match ? match[1] : null;
}

/** Only photos belonging to this listing — the page also carries "similar car" thumbnails. */
function parsePhotos(payload: string, listingId: string | null): string[] {
  const all = payload.match(/https:\/\/[^"'\s\\)]+?\/cars_used\/[^"'\s\\)]+?\.(?:jpe?g|png|webp)/gi) ?? [];
  const unique = Array.from(new Set(all));
  const mine = listingId ? unique.filter((url) => url.includes(`/${listingId}_`)) : [];
  // Sort so the primary shot (_1.jpg) leads, ahead of gallery variants (_1b.jpg).
  return (mine.length > 0 ? mine : unique).sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, 12);
}

function parseTitle(payload: string, html: string, text: string): string | null {
  const fromJson = jsonValue(payload, 'car_model');
  if (fromJson) return fromJson.trim();

  const tag = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const raw = tag ? decodeEntities(tag[1]) : text.slice(0, 120);
  const cleaned = raw.replace(/\|.*$/, '').replace(/\bfor sale\b.*$/i, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function parseListing(html: string, sourceUrl: string): ParsedListing {
  // The payload is JSON embedded in a JS string, so its quotes arrive escaped.
  const payload = html.replace(/\\"/g, '"');
  const text = toText(html);
  const listingId = parseListingId(sourceUrl);

  /** JSON key, then visible spec label, then rendered text. */
  const field = (key: string, label: string) =>
    jsonValue(payload, key) ?? labelledValue(payload, label) ?? textValue(text, label);

  const title = parseTitle(payload, html, text);
  const vehicleType = jsonValue(payload, 'type_of_veh') ?? labelledValue(payload, 'Type of Vehicle');

  const listing: ParsedListing = {
    sourceUrl,
    listingId,
    title,
    price: asMoney(field('price', 'Price'), MIN_PLAUSIBLE_PRICE),
    monthlyInstalmentQuoted: asMoney(field('installment', 'Installment')),
    depreciationPerYear: asMoney(field('depreciation', 'Depreciation')),
    registrationDate: field('reg_date', 'Reg Date'),
    coeMonthsRemaining: parseCoeRemaining(
      jsonValue(payload, 'coe_left') ?? (/(\d+\s*yrs?\s*\d+\s*mths?)[^.]{0,20}COE\s*left/i.exec(text)?.[1] ?? null),
    ),
    mileageKm: firstNumber(field('mileage', 'Mileage')),
    roadTaxAnnual: asMoney(field('road_tax', 'Road Tax')),
    deregValue: asMoney(field('dereg_value', 'Dereg Value')),
    omv: asMoney(field('omv', 'OMV'), MIN_PLAUSIBLE_PRICE),
    coe: asMoney(field('coe', 'COE'), MIN_PLAUSIBLE_PRICE),
    arf: asMoney(field('arf', 'ARF'), MIN_PLAUSIBLE_PRICE),
    engineCc: firstNumber(field('engine_cap', 'Engine Cap')),
    powerKw: firstNumber(field('power', 'Power')),
    curbWeightKg: firstNumber(field('curb_weight', 'Curb Weight')),
    owners: firstNumber(field('owner', 'No\\. of Owners')),
    vehicleType,
    fuelType: inferFuelType(jsonValue(payload, 'fuel_type'), text),
    bodyShape: inferBodyShape(vehicleType, title),
    photos: parsePhotos(payload, listingId),
    missing: [],
  };

  // A registration date is a date, not a number — reject anything that is not one.
  if (listing.registrationDate && !/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(listing.registrationDate.trim())) {
    listing.registrationDate = null;
  }

  const required: (keyof ParsedListing)[] = ['price', 'omv', 'coe', 'engineCc', 'coeMonthsRemaining'];
  listing.missing = required.filter((key) => listing[key] === null).map(String);

  // A dead listing id still returns HTTP 200, on a page advertising other cars.
  // Unless this page actually mentions the id we asked for, we are looking at
  // somebody else's car and every figure above belongs to it.
  if (listingId !== null && !payload.includes(listingId)) {
    return {
      ...listing,
      title: null,
      price: null,
      monthlyInstalmentQuoted: null,
      depreciationPerYear: null,
      registrationDate: null,
      coeMonthsRemaining: null,
      mileageKm: null,
      roadTaxAnnual: null,
      deregValue: null,
      omv: null,
      coe: null,
      arf: null,
      engineCc: null,
      powerKw: null,
      curbWeightKg: null,
      owners: null,
      vehicleType: null,
      photos: [],
      missing: required.map(String),
    };
  }

  return listing;
}

/**
 * Folds a parsed listing into an existing scenario, keeping the user's income
 * and loan preferences and replacing only what the listing actually knows.
 */
export function listingToScenario(listing: ParsedListing, base: Scenario): Scenario {
  const coeMonthsRemaining = listing.coeMonthsRemaining ?? base.car.coeMonthsRemaining;

  // Derived from the COE clock rather than today's date, so the same listing
  // always produces the same scenario.
  const vehicleAgeYears = Math.max(0, (COE.validityMonths - coeMonthsRemaining) / 12);

  const registrationYear = listing.registrationDate ? Number(listing.registrationDate.slice(-4)) : null;
  const parfScheme = registrationYear !== null && registrationYear >= 2026 ? 'from2026' : 'legacy';

  return {
    ...base,
    name: listing.title ?? base.name,
    car: {
      ...base.car,
      priceMode: 'total',
      totalPrice: listing.price ?? base.car.totalPrice,
      omv: listing.omv ?? base.car.omv,
      coe: listing.coe ?? base.car.coe,
      fuelType: listing.fuelType,
      engineCc: listing.engineCc ?? base.car.engineCc,
      motorPowerKw: listing.powerKw ?? base.car.motorPowerKw,
      vehicleAgeYears,
      coeMonthsRemaining,
      parfScheme,
    },
    running: {
      ...base.running,
      // The listing states road tax outright, so trust it over our own formula.
      roadTaxMode: listing.roadTaxAnnual !== null ? 'manual' : base.running.roadTaxMode,
      roadTaxAnnualOverride: listing.roadTaxAnnual ?? base.running.roadTaxAnnualOverride,
    },
  };
}
