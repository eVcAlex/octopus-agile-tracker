# Wholesale-derived "tomorrow" estimate — design

**Date:** 2026-07-01
**Status:** Approved (pending spec review)

## Problem

Octopus publishes tomorrow's confirmed Agile rates around 4pm. Before then, our
Tomorrow tab shows only a "not available until ~4pm" empty state. The GB
day-ahead wholesale auction that *drives* those rates clears around midday, so
for a few hours each day we can compute a good estimate of tomorrow's rates
before Octopus confirms them — turning a dead empty state into the app's
"feels ahead" moment.

This also delivers the related "label forecast confidence/source" idea: the
Tomorrow tab clearly distinguishes an **Estimate** (🔮, wholesale-derived) from
**Confirmed** (✓, published by Octopus).

## Goals

- Before ~4pm: show a clearly-labelled wholesale-derived estimate of tomorrow's
  half-hourly Agile rates on the Tomorrow tab.
- At/after ~4pm: automatically swap to Octopus's confirmed rates (existing
  behaviour) with a "Confirmed" label.
- Keep the app a self-contained static SPA — no new runtime server dependency.

## Non-goals (YAGNI)

- No historical archive of past estimates.
- No accuracy-tracking dashboard comparing estimate vs actual over time.
- No runtime auto-tuning/regression of coefficients (see Accuracy strategy —
  the regression is a one-time derivation done during implementation, not a
  runtime feature).
- No change to the AgilePredict forecast tab.

## Decisions (from brainstorming)

| Decision | Choice | Why |
|---|---|---|
| Wholesale data source | **Elexon BMRS Insights API** (Market Index) | Official, free, no API key; fine to ship in a public repo; no third-party ToS dependency |
| Compute location | **Client-side**, Elexon fetch via proxy | Matches existing forecast architecture; app stays static-deployable |
| UI placement | **Fill the Tomorrow tab** before 4pm | The empty state becomes useful; confirmed rates replace it automatically |
| Labelling | **Mandatory** Estimate vs Confirmed badge | At 4pm both the estimate becomes moot and confirmed rates arrive — must never be ambiguous |

## Architecture & data flow

Mirrors the existing forecast path (`/proxy/forecast` → `forecastApi.ts` →
`use-forecast` → Forecast tab):

```
Elexon BMRS ──/proxy/wholesale──▶ wholesaleApi.ts ──▶ agileFormula.ts ──▶ use-estimate ──▶ Tomorrow tab
(market-index)  (vercel rewrite +   (fetch + parse,     (D×w+P, cap,        (TanStack Query,   (existing
                 vite dev proxy)     £/MWh → p/kWh)       peak 16:00–19:00)    shaped as          DaySection)
                                                                              DailyPrices)
```

The estimate is shaped as the existing `DailyPrices` / `ProcessedSlot[]` types,
so the current **Chart / Heatmap / Table** components render it unchanged.

## Data source details

**Endpoint** (verified 2026-07-01):
`https://data.elexon.co.uk/bmrs/api/v1/balancing/pricing/market-index?from=<ISO>&to=<ISO>&format=json`

**Response shape:**

```jsonc
{
  "metadata": { "datasets": ["MID"] },
  "data": [
    {
      "startTime": "2026-06-30T00:00:00Z", // ISO 8601
      "dataProvider": "N2EXMIDP",           // or "APXMIDP"
      "settlementDate": "2026-06-30",
      "settlementPeriod": 1,                 // 1–48 (50 on long DST day)
      "price": 62.4,                          // £/MWh
      "volume": 123.4
    }
    // ...
  ]
}
```

**Parsing rules:**
- Prefer `dataProvider === "N2EXMIDP"`; fall back to `APXMIDP` if N2EX absent
  for a slot. Do **not** mix providers within a day unless a slot is missing.
- Convert £/MWh → p/kWh: `pPerKwh = priceGbpMwh / 10`.
- Match slots to half-hours by `startTime`.

## New modules (all under `src/features/pricing/`)

### `api/wholesaleApi.ts`
- `fetchTomorrowWholesale(): Promise<WholesaleSlot[]>` — builds the proxy URL for
  tomorrow's civil day (local `startOf('day')` → `endOf('day')`), fetches,
  zod-validates against a `marketIndexResponseSchema`, selects provider, returns
  `WholesaleSlot[] = { startTime: Date, priceGbpMwh: number }` sorted ascending.
- Pure parse/select logic extracted into a testable function
  (`selectWholesaleSlots(raw)`), mirroring `forecastApi.groupByDay`.

### `agileFormula.ts`
- `REGION_COEFFICIENTS: Record<Region, { multiplier: number; peakUplift: number }>`
  — per-region `D` and `P` (peak uplift applied 16:00–19:00 local).
- `wholesaleToAgile(pPerKwh: number, at: Date, region: Region): number` — returns
  inc-VAT p/kWh: `min(D * pPerKwh + (isPeak ? P : 0), 100)`. Peak window is
  `16:00 <= localHour < 19:00`. Cap is 100p/kWh inc VAT.
- `estimateSlots(wholesale: WholesaleSlot[], region: Region): ProcessedSlot[]` —
  maps to the existing `ProcessedSlot` shape (`dayType: 'tomorrow'`,
  `isCurrentPeriod: false`), so it flows through existing components and
  `calcStats`.

VAT handling: coefficients are defined to yield **inc-VAT** directly (the
validation fixture pins this down; if the documented coefficients turn out to be
exc-VAT, apply ×1.05 in one place and note it).

### `hooks/use-estimate.ts`
- TanStack Query, key `['estimate', region, tomorrowDateStr]`.
- `enabled` only when: region set AND tomorrow **not** yet published
  (`!hasTomorrowRates`).
- `staleTime` ~1h (auction result is stable once published).
- Returns `{ estimate: DailyPrices | null, loading, error }` using
  `errorMessage()` and shaped identically to `usePricing`'s `tomorrowData`.

### `components/RateSourceBadge/`
- Small presentational badge: `variant: 'estimate' | 'confirmed'`.
- Estimate → 🔮 "Estimate" (violet/dimmed); Confirmed → ✓ "Confirmed" (green).

## Tomorrow-tab logic (Dashboard)

Replace the current tomorrow panel logic with:

1. `tomorrowData.rates.length > 0` → **confirmed**: existing `DaySection` +
   `RateSourceBadge variant="confirmed"`.
2. else `estimate` available → **estimate**: `DaySection` with `estimate` data +
   `RateSourceBadge variant="estimate"` + banner: *"Estimate from wholesale
   prices — Octopus confirms tomorrow's rates around 4pm."*
3. else → existing "Tomorrow's rates not yet available" empty state (covers
   early morning before the auction clears / Elexon returns no data).

`use-estimate` is called in the Dashboard (or a thin wrapper) alongside the
existing hooks; the estimate query is disabled once confirmed rates exist, so no
wasted fetches after 4pm.

## Proxy configuration

- **vercel.json** — add a rewrite:
  `/proxy/wholesale` → `https://data.elexon.co.uk/bmrs/api/v1/balancing/pricing/market-index`
  (query string passed through).
- **vite.config.ts** — add a dev `server.proxy` entry for `/proxy/wholesale`
  targeting `https://data.elexon.co.uk` with the appropriate path rewrite,
  mirroring the existing `/proxy/forecast` entry.

The client always calls the relative `/proxy/wholesale?from=…&to=…` URL; dev and
prod differ only in the proxy layer.

## Accuracy strategy (the main risk)

The per-region `D`/`P` coefficients determine estimate quality.

1. **Seed** `REGION_COEFFICIENTS` from documented community values
   (energy-stats.uk / public Agile-formula write-ups).
2. **Validation test** — capture one real day's wholesale prices (Elexon) and
   that same day's Octopus **confirmed** rates for one region as a fixture;
   assert `estimateSlots` reproduces confirmed within tolerance (≈±1p off-peak,
   a looser bound during the peak window). This is the correctness gate and
   catches VAT/peak/cap errors.
3. **Derivation method** (one-time, during implementation) — because we can fetch
   both wholesale and confirmed rates for the same half-hours, a linear fit of
   confirmed-vs-wholesale per region recovers `D` (slope) and `P` (peak-window
   intercept delta). Used to populate/verify the table; **not** a runtime
   feature.

If a region's estimate can't be made accurate enough, it's acceptable to fall
back to the existing empty state for that region rather than show a misleading
number.

## Testing

- `agileFormula.test.ts` — peak vs off-peak uplift; the £1/kWh cap; £/MWh→p/kWh
  conversion; and the real-day validation fixture (item 2 above).
- `wholesaleApi.test.ts` — `selectWholesaleSlots` parsing, provider
  selection/fallback, 48-slot assembly, ascending sort. Pure-function tests in
  the style of `forecastApi.test.ts` (no network).

## Files touched (summary)

New:
- `src/features/pricing/api/wholesaleApi.ts` (+ test)
- `src/features/pricing/agileFormula.ts` (+ test)
- `src/features/pricing/hooks/use-estimate.ts`
- `src/features/pricing/components/RateSourceBadge/index.tsx`

Modified:
- `src/features/pricing/components/Dashboard/index.tsx` (Tomorrow-tab logic)
- `vite.config.ts` (dev proxy)
- `vercel.json` (rewrite)
- `README.md` (mention the wholesale estimate + Elexon as a data source)

## Rollback / safety

Purely additive to the Tomorrow tab. If the estimate is wrong or Elexon is down,
the tab falls back to the existing empty/confirmed states. No change to
electricity/gas/usage/forecast data paths.
