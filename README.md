# OYC — Own Your Car

A Singapore car affordability app for iOS, Android and the web. It answers one question honestly: **how much do you actually need to earn, and to have saved, before you can own this car?**

Paste a car listing and it reads the price, OMV, ARF, COE and road tax straight off the page, then tells you where the car lands against your income — in four words.

Live: **<https://oyc-jade.vercel.app>**

---

## The verdict scale

Everything the app says reduces to one number: what share of your **gross monthly income** the car eats, all in.

| Share of gross income | Verdict |
|---|---|
| under 10% | **Comfortable** — the car will not shape the rest of your life |
| 10 – 20% | **Affordable** — a real cost, but your income absorbs it |
| 20 – 30% | **Barely affordable** — savings and holidays are what pay for it |
| 30% and above | **Too expensive** — past 40% it is not a car payment, it is a second rent |

This scale lives in one module, [`src/core/bands.ts`](src/core/bands.ts), and every screen reads from it. That is deliberate: an earlier build kept a second copy of the thresholds and the verdict tab and the landing page ended up disagreeing about the same car.

Alongside it the app enforces **TDSR**, the real regulatory ceiling: all monthly debt must stay under 55% of gross income. A car can pass TDSR and still be unaffordable, and the app shows exactly that.

## Why 20-4-10 does not work here

The most-cited rule online is American, and two of its three legs are impossible in Singapore. OYC shows it failing leg by leg rather than ignoring it.

| Leg | US rule | Singapore |
|---|---|---|
| **20% down** | 20% | **Below the legal floor.** MAS caps the loan at 70% of price when OMV ≤ $20,000, and 60% above that — the minimum down payment is 30% or **40%**. |
| **4-year term** | ≤ 48 months | **Holds, and matters more.** Max tenure is 7 years, but loans are *flat-rate*: a 7-year loan costs 75% more interest than a 4-year one on the same principal. |
| **10% of income** | ≤ 10% gross | **Out of reach.** A Cat A COE alone is around $124,000. |

## What it does

**Paste a listing.** Give it an sgcarmart URL and it returns the asking price, OMV, ARF, COE, engine capacity, road tax, registration date, remaining COE, mileage and owner count — then flashes the verdict and spins a 3D car painted by that verdict.

**Or enter it yourself.** Every field is editable, including all the running costs: petrol or charging, maintenance, servicing, washing, HDB season parking, other parking, insurance, ERP, road tax, plus your own custom lines.

**Then it calculates:**

- **Loan** — LTV cap by OMV, tenure cap, flat-rate instalment, and the *effective* reducing-balance rate the flat rate hides (2.88% flat is roughly 5.3% real)
- **Road tax** — from engine capacity or motor power, including the 10-years-plus age surcharge, the EV flat component and the diesel special tax
- **Price build-up** — OMV → excise duty → GST → ARF → COE → registration fee, so you can see how little of the price is the actual car
- **Income** — gross monthly, annual with bonus months, and income after CPF, or your own take-home figure
- **True cost** — full cost of ownership over your holding period, net of PARF and COE rebates, plus annual depreciation

## Getting started

```bash
npm install
npm start          # scan the QR code with Expo Go
```

| Command | What it does |
|---|---|
| `npm start` | Dev server — runs in Expo Go, no native build needed |
| `npm test` | Calculation engine test suite (117 tests) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate app icons from `scripts/generate-icons.mjs` |

## Project layout

```
app/
  index.tsx               Landing page — hero, rotating car, the four bands
  (tabs)/listing.tsx      Paste a link, flash the verdict
  (tabs)/calculator.tsx   Income, car, loan, monthly expenses
  (tabs)/verdict.tsx      20-4-10 vs the OYC rule, TDSR, cash needed
  (tabs)/truecost.tsx     Ten-year cost of ownership, rebates, depreciation
  (tabs)/learn.tsx        Every constant, explained, with sources
api/listing.ts            Stateless edge function that fetches a listing
src/core/                 Pure TypeScript engine — no React Native imports
  bands.ts                The four-word verdict scale
  listing.ts              Listing parser (pure; shared with the API route)
  arf / roadTax / cpf / loan / price / running / verdict / tco
src/data/sg-2026-08.ts    Versioned Singapore constants, all user-editable
src/state/                Zustand store (AsyncStorage) and the listing client
src/ui/                   Tokens, components, and the three.js car
__tests__/core/           The calculation contract
__tests__/fixtures/       A real captured listing page, pinning the parser
```

The strict separation between `src/core` and everything else is the load-bearing decision: the whole finance engine is plain TypeScript, so every Singapore rule is verified under Node without a simulator.

## Why there is a server

There is exactly one server-side piece, [`api/listing.ts`](api/listing.ts), and it exists because listing sites send no CORS headers — a browser cannot read them directly. It is stateless: no account, no database, no keys, nothing stored. It refuses URLs outside the sites it understands so it cannot be used as an open proxy.

The parsing itself is pure and lives in `src/core/listing.ts`, pinned by tests against a captured page. Refresh that capture when the site changes its markup:

```bash
curl -sA "Mozilla/5.0" -L "<listing url>" -o car-raw.html
python scripts/capture-listing-fixture.py
```

The parser reads a JSON payload embedded in the page, falls back to the visible spec labels, then to plain text. Anything it cannot find is reported in `missing` rather than guessed at — and it refuses pages that do not mention the listing id you asked for, because a dead listing still returns HTTP 200 on a page selling other cars.

## The 3D car

No real 3D model exists for an arbitrary used-car listing, so the car is procedural — built from primitives in [`src/ui/CarScene.tsx`](src/ui/CarScene.tsx), shaped by the listing's body type and painted by the verdict. The app says it is a representation. The scene is shared; only the canvas differs, `@react-three/fiber` on web and `expo-gl` on native.

## Data

All figures are **defaults gathered in August 2026**, and every one is editable in the app. The Learn tab shows the vintage and links the source for each.

- COE Cat A $123,890 · Cat B $129,910 (Aug 2026, first bidding)
- ARF marginal tiers 100 / 140 / 190 / 250 / 320%
- Road tax bands with the 0.782 rebate factor
- PARF: 30%→5% capped at $30,000 from Feb 2026; 75%→50% capped at $60,000 for Feb 2023 – Jan 2026
- HDB season parking $80 surface / $110 sheltered, URA $90

## Publishing

Build config is in `eas.json`; the bundle identifier is `sg.oyc.app` on both platforms.

- [`docs/publishing/android-submission.md`](docs/publishing/android-submission.md) — Google Play, US$25 one-time
- [`docs/publishing/ios-submission.md`](docs/publishing/ios-submission.md) — App Store, US$99/year (no Mac required; EAS builds in the cloud)

The web build deploys to Vercel from `vercel.json`, which runs `expo export --platform web`.

## Disclaimer

OYC is a planning tool, not financial advice. COE prices move twice a month and tax rules change at every Budget. Confirm every figure with LTA, your bank and your insurer before committing to anything.
