# OYC — Own Your Car · Design

**Date:** 2026-08-16
**Status:** Implemented (v1)

## Problem

Singaporeans routinely underestimate what a car costs, because the sticker price hides COE, ARF, a decade of running costs, and a loan quoted at a flat rate that makes borrowing look about half as expensive as it is. The most-cited rule of thumb online — the American **20-4-10** — is actively misleading in Singapore: two of its three legs are impossible to satisfy here.

## Goal

A cross-platform mobile app (iOS + Android) that takes a user's income, target car, loan terms and running costs, and returns an honest verdict: can you afford this, what income would you need, and how much cash must you have on hand.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Stack | Expo + React Native + TypeScript | One codebase for both stores; EAS Build compiles iOS in the cloud, so no Mac is needed on a Windows machine |
| Scope | Full affordability engine, local-only | No backend means no accounts, no privacy policy burden for data collection, no server to keep alive |
| Data | Bundled versioned constants, all editable | Works offline, nothing to break when a source site changes; the vintage is shown in-app so stale numbers are never presented as current |
| Persistence | AsyncStorage, not MMKV | MMKV needs a native build; AsyncStorage runs in Expo Go, so the app can be tried on any phone without a dev build |
| Animation | None (Reanimated removed) | Nothing in the design needed it, and it pulls in a native worklets dependency |

## The 20-4-10 analysis

This is a feature, not a footnote — the app renders it leg by leg.

| Leg | Verdict in Singapore |
|---|---|
| 20% down payment | **Below the legal floor.** MAS Notice 642 caps the loan at 70% of price when OMV ≤ $20,000 and 60% above it, so the minimum down payment is 30% or 40%. |
| 4-year loan term | **Applies, and matters more than overseas.** Max tenure is 7 years, but interest is flat-rate, so it scales linearly with tenure: 7 years costs 75% more interest than 4. |
| 10% of gross income | **Unreachable.** All-in monthly cost of a mainstream new car lands near $3,000, implying $30,000/month gross. Local guidance says 15–20%. |

**The OYC rule** replaces it: put down the regulatory minimum, cap the loan at 5 years, keep all-in car costs under 15% of gross monthly income (15–20% = stretch, above 20% = fail). **TDSR** (all debt ≤ 55% of gross income) sits alongside as the hard regulatory gate — a scenario can pass TDSR and still be unaffordable, which the app demonstrates directly.

## Architecture

Strict split between a pure calculation core and the UI shell.

```
src/core/     Pure TypeScript. No React Native imports. Fully unit tested.
  types.ts    Scenario, Income, Car, Loan, RunningCosts, Verdict
  arf.ts      ARF from OMV (marginal tiers)
  roadTax.ts  Road tax from cc / kW, age surcharge, EV flat component, diesel
  cpf.ts      Employee CPF -> take-home; annual income with bonus months
  price.ts    OMV -> excise -> GST -> ARF -> COE -> registration -> margin
  loan.ts     LTV cap, tenure cap, flat-rate instalment, implied effective rate
  running.ts  Monthly running-cost total incl. amortised road tax
  verdict.ts  20-4-10, the OYC rule, TDSR, upfront cash, required income
  tco.ts      Cost of ownership, PARF + COE rebates, depreciation
  defaults.ts Seed scenario shared by the app and the tests

src/data/sg-2026-08.ts   Versioned constants with source URLs and an asOf date
src/state/useScenario.ts Zustand store persisted via AsyncStorage
src/ui/                  Tokens, formatting, shared components
app/(tabs)/              Four screens; no calculation lives in a component
```

Data flow: the store holds one `Scenario`; screens read from it and call `evaluateScenario` / `computeTco` to derive everything shown.

## Screens

1. **Your numbers** — accordion sections for income, car, loan and monthly expenses, with a sticky verdict bar that updates on every keystroke and links to the verdict.
2. **Verdict** — headline monthly cost, the two numbers that matter (income required, cash required), TDSR gauge, both rules leg by leg, and the explainer on why 20-4-10 fails here.
3. **True cost** — adjustable holding period, net cost after rebates, effective monthly cost, annual depreciation, money-out breakdown, and what share of the price is car vs tax vs COE.
4. **Learn** — every bundled constant rendered from the data module, with sources and the "as of" date.

## Testing

The engine is the risk, so it carries the tests: 80 unit tests across `__tests__/core/`, anchored on published worked examples — OMV $100,000 → ARF $200,000; 1,798cc → $975/year road tax; $100,000 at 2.8% flat over 5 years → $1,900/month.

The UI is deliberately thin enough that visual verification on a device is adequate coverage for v1.

## Out of scope for v1

Accounts, cloud sync, live COE scraping, insurance quote comparison, used-car listings, monetisation.
