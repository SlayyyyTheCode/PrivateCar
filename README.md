# OYC — Own Your Car

A Singapore car affordability app for iOS and Android. It answers one question honestly: **how much do you actually need to earn, and to have saved, before you can own this car?**

Built with Expo + React Native + TypeScript. Runs offline; no accounts, no server, no data leaves the phone.

---

## Why it exists

The sticker price of a car in Singapore hides almost everything that matters — COE, ARF, a decade of running costs, and a loan quoted at a flat rate that roughly halves how expensive it looks. The usual American rule of thumb, **20-4-10**, is not just unhelpful here; two of its three legs are impossible:

| Leg | US rule | Singapore |
|---|---|---|
| **20% down** | 20% | **Below the legal floor.** MAS caps the loan at 70% of price when OMV ≤ $20,000, and 60% above that — so the minimum down payment is 30% or **40%**. |
| **4-year term** | ≤ 48 months | **Holds, and matters more.** Max tenure is 7 years, but loans are *flat-rate*: a 7-year loan costs 75% more interest than a 4-year one on the same principal. |
| **10% of income** | ≤ 10% gross | **Out of reach.** A Cat A COE alone is around $124,000. All-in monthly cost for a mainstream car lands near $3,000, implying a $30,000/month income. |

OYC shows 20-4-10 in full, explains exactly how each leg fails, and then applies a Singapore-adapted rule:

> **Put down what the law requires. Keep the loan to five years or fewer. Keep all-in car costs under 15% of gross monthly income** — 15–20% is a stretch, above 20% is a no.

On top of that it enforces the real regulatory gate, **TDSR**: all monthly debt must stay under 55% of gross income.

## What it calculates

- **Loan** — LTV cap by OMV, tenure cap, flat-rate instalment, and the *effective* reducing-balance rate the flat rate really implies
- **Road tax** — from engine capacity or motor power, including the 10-years-plus age surcharge, the EV flat component and the diesel special tax
- **Price build-up** — OMV → excise duty → GST → ARF → COE → registration fee, so you can see how little of the price is the actual car
- **Running costs** — petrol/charging, maintenance, servicing, washing, HDB season parking, other parking, insurance, ERP, road tax, plus your own custom lines
- **Income** — gross monthly, annual with bonus months, and income after CPF (or your own take-home figure)
- **Verdict** — 20-4-10 vs the OYC rule, leg by leg, plus TDSR, the income you would need, and the cash you must have on hand
- **True cost** — full cost of ownership over your holding period, net of PARF and COE rebates, and annual depreciation

## Getting started

```bash
npm install
npm start          # then scan the QR code with Expo Go on your phone
```

| Command | What it does |
|---|---|
| `npm start` | Start the dev server (Expo Go, no native build needed) |
| `npm test` | Run the calculation engine test suite |
| `npm run typecheck` | TypeScript, no emit |
| `npx expo export --platform android` | Verify the app bundles |

## Project layout

```
app/                      expo-router screens — UI only, no calculations
  (tabs)/index.tsx        Your numbers: income, car, loan, monthly expenses
  (tabs)/verdict.tsx      20-4-10 vs the OYC rule, TDSR, cash needed
  (tabs)/truecost.tsx     10-year cost of ownership, rebates, depreciation
  (tabs)/learn.tsx        Every constant, explained, with sources
src/core/                 Pure TypeScript engine — no React Native imports
src/data/sg-2026-08.ts    Versioned Singapore constants, all user-editable
src/state/useScenario.ts  Zustand store, persisted with AsyncStorage
src/ui/                   Design tokens, formatting, shared components
__tests__/core/           The calculation contract
```

The strict separation between `src/core` and everything else is deliberate: the whole finance engine is plain TypeScript, so every Singapore rule is verified under Node without a simulator.

## Data

All figures are **defaults gathered in August 2026**, and every one of them is editable in the app. The Learn tab shows the vintage and links to the source for each. Key values:

- COE Cat A $123,890 · Cat B $129,910 (Aug 2026, first bidding)
- ARF marginal tiers 100 / 140 / 190 / 250 / 320%
- Road tax bands with the 0.782 rebate factor
- PARF: 30%→5% capped at $30,000 for cars registered from Feb 2026; 75%→50% capped at $60,000 for Feb 2023 – Jan 2026
- HDB season parking $80 surface / $110 sheltered, URA $90

## Publishing

Build config lives in `eas.json`; bundle identifier is `sg.oyc.app` on both platforms. Step-by-step submission guides:

- [`docs/publishing/android-submission.md`](docs/publishing/android-submission.md) — Google Play, US$25 one-time
- [`docs/publishing/ios-submission.md`](docs/publishing/ios-submission.md) — App Store, US$99/year (no Mac required; EAS builds in the cloud)

## Disclaimer

OYC is a planning tool, not financial advice. COE prices move twice a month and tax rules change at every Budget. Confirm every figure with LTA, your bank and your insurer before committing to anything.
