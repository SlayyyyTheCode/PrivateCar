import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  byGalleryIndex,
  galleryCandidates,
  isSupportedListingUrl,
  listingToScenario,
  parseListing,
} from '../../src/core/listing';
import { createDefaultScenario } from '../../src/core/defaults';

const html = readFileSync(join(__dirname, '../fixtures/sgcarmart-listing.html'), 'utf-8');

describe('isSupportedListingUrl', () => {
  it('accepts sgcarmart listing URLs', () => {
    expect(isSupportedListingUrl('https://www.sgcarmart.com/used-cars/info/audi-a4-20a-tfsi-1530094?dl=4645')).toBe(
      true,
    );
    expect(isSupportedListingUrl('http://sgcarmart.com/used-cars/info/honda-civic-123')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isSupportedListingUrl('https://example.com/car')).toBe(false);
    expect(isSupportedListingUrl('not a url')).toBe(false);
    expect(isSupportedListingUrl('')).toBe(false);
  });
});

describe('parseListing — real sgcarmart capture', () => {
  const listing = parseListing(html, 'https://www.sgcarmart.com/used-cars/info/audi-a4-20a-tfsi-1530094?dl=4645');

  it('reads the car name', () => {
    expect(listing.title).toMatch(/Audi A4/i);
  });

  it('reads the asking price', () => {
    expect(listing.price).toBe(58_300);
  });

  it('reads the tax components the affordability engine needs', () => {
    expect(listing.omv).toBe(33_763);
    expect(listing.arf).toBe(39_269);
    expect(listing.coe).toBe(31_001);
  });

  it('reads the vehicle specifications', () => {
    expect(listing.engineCc).toBe(1_984);
    expect(listing.powerKw).toBeCloseTo(140, 1);
    expect(listing.curbWeightKg).toBe(1_480);
    expect(listing.owners).toBe(2);
    expect(listing.vehicleType).toMatch(/Luxury Sedan/i);
  });

  it('reads the running costs the listing already knows', () => {
    expect(listing.roadTaxAnnual).toBe(1_194);
    expect(listing.depreciationPerYear).toBe(16_470);
    expect(listing.deregValue).toBe(30_840);
  });

  it('reads registration date and converts the remaining COE to months', () => {
    expect(listing.registrationDate).toBe('27-Dec-2018');
    // "2yrs 4mths 4days COE left"
    expect(listing.coeMonthsRemaining).toBe(28);
  });

  it('reads mileage', () => {
    expect(listing.mileageKm).toBe(115_000);
  });

  it('picks up a photo of the car', () => {
    expect(listing.photos[0]).toMatch(/1530094_1\.jpg$/);
  });

  it('reads the declared fuel type', () => {
    expect(listing.fuelType).toBe('petrol');
  });

  it('records which fields it could not find, instead of inventing them', () => {
    expect(Array.isArray(listing.missing)).toBe(true);
    expect(listing.missing).not.toContain('omv');
  });
});

describe('parseListing — fuel type', () => {
  // Every sgcarmart page carries "Electric Cars" navigation and an
  // `electric_info` key, so a naive full-page scan reads petrol cars as EVs —
  // which would then bill them for EV road tax and the $700 flat component.
  const noisy = (declared: string) =>
    `<html><body>Electric Cars <script>{"fuel_type":"${declared}","electric_info":null}</script></body></html>`;

  it('is not fooled into calling a petrol car electric', () => {
    expect(parseListing(noisy('Petrol'), 'https://sgcarmart.com/x').fuelType).toBe('petrol');
  });

  it('still recognises a genuine EV', () => {
    expect(parseListing(noisy('Electric'), 'https://sgcarmart.com/x').fuelType).toBe('ev');
  });

  it('still recognises hybrids and diesels', () => {
    expect(parseListing(noisy('Petrol-Electric'), 'https://sgcarmart.com/x').fuelType).toBe('ev');
    expect(parseListing(noisy('Hybrid'), 'https://sgcarmart.com/x').fuelType).toBe('hybrid');
    expect(parseListing(noisy('Diesel'), 'https://sgcarmart.com/x').fuelType).toBe('diesel');
  });

  it('falls back to scanning the page when nothing is declared', () => {
    const html = '<html><body>Type of Vehicle Hatchback. This car is a Diesel.</body></html>';
    expect(parseListing(html, 'https://sgcarmart.com/x').fuelType).toBe('diesel');
  });
});

describe('parseListing — wrong or dead page', () => {
  it('refuses a page that does not mention the listing we asked for', () => {
    // A dead listing id still returns HTTP 200, on a page selling other cars.
    // Scraping it would produce a confident verdict about somebody else's car.
    const otherCar =
      '<html><script>{"aid":1266001,"car_model":"Toyota Vellfire 2.5A","price":"$$188,800","omv":"$$40,000"}</script></html>';
    const listing = parseListing(otherCar, 'https://www.sgcarmart.com/used-cars/info/does-not-exist-99999999');
    expect(listing.price).toBeNull();
    expect(listing.omv).toBeNull();
    expect(listing.title).toBeNull();
    expect(listing.missing).toContain('price');
  });

  it('rejects implausibly small money, which is markup noise', () => {
    const noise = '<html><script>{"aid":99999999,"price":"$$7","omv":"$$26"}</script></html>';
    const listing = parseListing(noise, 'https://www.sgcarmart.com/used-cars/info/x-99999999');
    expect(listing.price).toBeNull();
    expect(listing.omv).toBeNull();
  });
});

describe('parseListing — degrading safely', () => {
  it('returns a listing with nulls rather than throwing on junk input', () => {
    const listing = parseListing('<html><body>nothing here</body></html>', 'https://sgcarmart.com/x');
    expect(listing.price).toBeNull();
    expect(listing.omv).toBeNull();
    expect(listing.missing).toContain('price');
    expect(listing.missing).toContain('omv');
  });

  it('ignores figures that are obviously not money', () => {
    const listing = parseListing('<html>Price $0 OMV $99,999,999</html>', 'https://sgcarmart.com/x');
    expect(listing.price).toBeNull();
    expect(listing.omv).toBeNull();
  });
});

describe('galleryCandidates', () => {
  const seed = 'https://i.i-sgcm.com/cars_used/202608/1530094_1b.jpg';

  it('derives the whole gallery from one known image', () => {
    const candidates = galleryCandidates(seed, '1530094');
    expect(candidates).toContain('https://i.i-sgcm.com/cars_used/202608/1530094_1.jpg');
    expect(candidates).toContain('https://i.i-sgcm.com/cars_used/202608/1530094_9b.jpg');
    expect(candidates.length).toBeGreaterThan(9);
  });

  it('keeps the directory and file extension of the image it was given', () => {
    for (const url of galleryCandidates(seed, '1530094')) {
      expect(url.startsWith('https://i.i-sgcm.com/cars_used/202608/1530094_')).toBe(true);
      expect(url.endsWith('.jpg')).toBe(true);
    }
  });

  it('handles other extensions', () => {
    const webp = galleryCandidates('https://cdn.example.com/a/b/777888_2b.webp', '777888');
    expect(webp[0]).toBe('https://cdn.example.com/a/b/777888_1.webp');
  });

  it('gives up rather than guessing when there is nothing to pattern-match', () => {
    expect(galleryCandidates(undefined, '1530094')).toEqual([]);
    expect(galleryCandidates(seed, null)).toEqual([]);
    // A URL that does not belong to this listing must not seed a gallery.
    expect(galleryCandidates('https://i.i-sgcm.com/cars_used/202608/999_1b.jpg', '1530094')).toEqual([]);
  });
});

describe('byGalleryIndex', () => {
  it('orders numerically, not as strings', () => {
    const urls = ['a/1_10b.jpg', 'a/1_2b.jpg', 'a/1_1b.jpg'];
    expect([...urls].sort(byGalleryIndex)).toEqual(['a/1_1b.jpg', 'a/1_2b.jpg', 'a/1_10b.jpg']);
  });
});

describe('listingToScenario', () => {
  const listing = parseListing(html, 'https://www.sgcarmart.com/used-cars/info/audi-a4-20a-tfsi-1530094?dl=4645');

  it('carries the listing into a scenario the engine can evaluate', () => {
    const scenario = listingToScenario(listing, createDefaultScenario());
    expect(scenario.car.totalPrice).toBe(58_300);
    expect(scenario.car.omv).toBe(33_763);
    expect(scenario.car.coe).toBe(31_001);
    expect(scenario.car.engineCc).toBe(1_984);
    expect(scenario.car.coeMonthsRemaining).toBe(28);
    expect(scenario.car.priceMode).toBe('total');
    expect(scenario.name).toMatch(/Audi A4/i);
  });

  it('uses the listing road tax rather than recomputing it', () => {
    const scenario = listingToScenario(listing, createDefaultScenario());
    expect(scenario.running.roadTaxMode).toBe('manual');
    expect(scenario.running.roadTaxAnnualOverride).toBe(1_194);
  });

  it('puts a used car on the legacy PARF schedule', () => {
    const scenario = listingToScenario(listing, createDefaultScenario());
    expect(scenario.car.parfScheme).toBe('legacy');
    expect(scenario.car.vehicleAgeYears).toBeGreaterThan(5);
  });

  it('keeps the user income and loan preferences untouched', () => {
    const base = createDefaultScenario();
    base.income.grossMonthlyIncome = 12_345;
    base.loan.tenureYears = 3;
    const scenario = listingToScenario(listing, base);
    expect(scenario.income.grossMonthlyIncome).toBe(12_345);
    expect(scenario.loan.tenureYears).toBe(3);
  });
});
