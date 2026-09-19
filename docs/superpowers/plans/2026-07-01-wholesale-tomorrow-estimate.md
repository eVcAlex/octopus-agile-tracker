# Wholesale Tomorrow Estimate: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a wholesale-derived estimate of tomorrow's Agile rates on the Tomorrow tab before Octopus publishes (~4pm), clearly labelled Estimate vs Confirmed.

**Architecture:** Client-side, mirroring the existing forecast path. A `/proxy/wholesale` rewrite fetches the Elexon day-ahead market index; `agileFormula.ts` converts wholesale £/MWh into inc-VAT p/kWh Agile rates via `min(D×w+P, cap)`; a `use-estimate` hook shapes them as the existing `DailyPrices` type so current Chart/Heatmap/Table components render them unchanged.

**Tech Stack:** React 19, TypeScript, TanStack Query, wretch, zod, dayjs, Mantine, Vitest.

## Global Constraints

- Estimate slots MUST reuse the existing `ProcessedSlot` / `DailyPrices` shapes (no new render components for the chart/heatmap/table).
- The estimate query MUST be disabled once confirmed rates exist (`!hasTomorrowRates`), no wasted fetches after 4pm.
- Peak uplift window: `16:00 <= localHour < 19:00`. Cap: `100` p/kWh inc VAT.
- Wholesale conversion: `pPerKwh = priceGbpMwh / 10`.
- Provider preference: `N2EXMIDP`, fallback `APXMIDP`; never mix providers for a slot that has N2EX.
- Error strings via the existing `errorMessage()` helper (`src/lib/errors.ts`).
- Only pure logic gets unit tests (matches codebase convention: hooks/components are untested).

---

### Task 1: Agile formula module

**Files:**
- Modify: `src/features/pricing/schemas.ts` (add `WholesaleSlot`)
- Create: `src/features/pricing/agileFormula.ts`
- Test: `src/features/pricing/agileFormula.test.ts`

**Interfaces:**
- Consumes: `Region`, `ProcessedSlot` from `./schemas`.
- Produces:
  - `interface WholesaleSlot { startTime: Date; priceGbpMwh: number }`
  - `REGION_COEFFICIENTS: Record<Region, { multiplier: number; peakUplift: number }>`
  - `isPeak(at: Date): boolean`
  - `wholesaleToAgile(pPerKwh: number, at: Date, region: Region): number` (inc-VAT p/kWh)
  - `estimateSlots(wholesale: WholesaleSlot[], region: Region): ProcessedSlot[]`

- [ ] **Step 1: Add the `WholesaleSlot` type to schemas.ts**

Add near the other processed types in `src/features/pricing/schemas.ts`:

```ts
export interface WholesaleSlot {
  startTime: Date;
  priceGbpMwh: number;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/features/pricing/agileFormula.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isPeak,
  wholesaleToAgile,
  estimateSlots,
  REGION_COEFFICIENTS,
} from './agileFormula';
import type { WholesaleSlot } from './schemas';

describe('isPeak', () => {
  it('is true inside 16:00–19:00 and false outside', () => {
    expect(isPeak(new Date('2026-07-02T17:00:00'))).toBe(true);
    expect(isPeak(new Date('2026-07-02T16:00:00'))).toBe(true);
    expect(isPeak(new Date('2026-07-02T19:00:00'))).toBe(false);
    expect(isPeak(new Date('2026-07-02T09:00:00'))).toBe(false);
  });
});

describe('wholesaleToAgile', () => {
  it('applies the region multiplier off-peak', () => {
    const { multiplier } = REGION_COEFFICIENTS.C;
    const price = wholesaleToAgile(10, new Date('2026-07-02T09:00:00'), 'C');
    expect(price).toBeCloseTo(multiplier * 10, 5);
  });

  it('adds the peak uplift inside the peak window', () => {
    const { multiplier, peakUplift } = REGION_COEFFICIENTS.C;
    const price = wholesaleToAgile(10, new Date('2026-07-02T17:30:00'), 'C');
    expect(price).toBeCloseTo(multiplier * 10 + peakUplift, 5);
  });

  it('caps at 100p/kWh inc VAT', () => {
    const price = wholesaleToAgile(9999, new Date('2026-07-02T17:30:00'), 'C');
    expect(price).toBe(100);
  });
});

describe('estimateSlots', () => {
  it('maps wholesale slots to ProcessedSlot with 30-min windows and VAT split', () => {
    const wholesale: WholesaleSlot[] = [
      { startTime: new Date('2026-07-02T00:00:00'), priceGbpMwh: 100 }, // 10 p/kWh
    ];
    const [slot] = estimateSlots(wholesale, 'C');
    expect(slot.dayType).toBe('tomorrow');
    expect(slot.isCurrentPeriod).toBe(false);
    expect(slot.validTo.getTime() - slot.validFrom.getTime()).toBe(30 * 60_000);
    expect(slot.priceExcVat).toBeCloseTo(slot.priceIncVat / 1.05, 5);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- agileFormula`
Expected: FAIL (`Cannot find module './agileFormula'`).

- [ ] **Step 4: Write the implementation**

Create `src/features/pricing/agileFormula.ts`:

```ts
import dayjs from 'dayjs';
import type { Region, ProcessedSlot, WholesaleSlot } from './schemas';

interface Coeff {
  multiplier: number;
  peakUplift: number; // p/kWh inc VAT, added 16:00–19:00 local
}

// Inc-VAT p/kWh coefficients for AGILE-24-10-01: agile = D*wholesale + P(peak).
// Seed values, the per-region table is calibrated against real data in Task 3.
const SEED: Coeff = { multiplier: 0.94, peakUplift: 12 };

export const REGION_COEFFICIENTS: Record<Region, Coeff> = {
  A: { ...SEED },
  B: { ...SEED },
  C: { ...SEED },
  D: { ...SEED },
  E: { ...SEED },
  F: { ...SEED },
  G: { ...SEED },
  H: { ...SEED },
  J: { ...SEED },
  K: { ...SEED },
  L: { ...SEED },
  M: { ...SEED },
  N: { ...SEED },
  P: { ...SEED },
};

const PEAK_START_HOUR = 16;
const PEAK_END_HOUR = 19;
const CAP_INC_VAT = 100;

export function isPeak(at: Date): boolean {
  const h = at.getHours();
  return h >= PEAK_START_HOUR && h < PEAK_END_HOUR;
}

export function wholesaleToAgile(
  pPerKwh: number,
  at: Date,
  region: Region
): number {
  const { multiplier, peakUplift } = REGION_COEFFICIENTS[region];
  const raw = multiplier * pPerKwh + (isPeak(at) ? peakUplift : 0);
  return Math.min(raw, CAP_INC_VAT);
}

export function estimateSlots(
  wholesale: WholesaleSlot[],
  region: Region
): ProcessedSlot[] {
  return wholesale.map((w, i) => {
    const from = w.startTime;
    const to = new Date(from.getTime() + 30 * 60_000);
    const incVat = wholesaleToAgile(w.priceGbpMwh / 10, from, region);
    return {
      id: `est-${from.toISOString()}-${i}`,
      time: dayjs(from).format('HH:mm'),
      date: dayjs(from).format('YYYY-MM-DD'),
      priceExcVat: incVat / 1.05,
      priceIncVat: incVat,
      validFrom: from,
      validTo: to,
      isCurrentPeriod: false,
      dayType: 'tomorrow',
    };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- agileFormula`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/features/pricing/schemas.ts src/features/pricing/agileFormula.ts src/features/pricing/agileFormula.test.ts
git commit -m "feat: add Agile wholesale-to-rate formula module"
```

---

### Task 2: Wholesale API client + proxy config

**Files:**
- Create: `src/features/pricing/api/wholesaleApi.ts`
- Test: `src/features/pricing/api/wholesaleApi.test.ts`
- Modify: `vite.config.ts` (dev proxy)
- Modify: `vercel.json` (rewrite)

**Interfaces:**
- Consumes: `WholesaleSlot` from `../schemas`.
- Produces:
  - `selectWholesaleSlots(raw): WholesaleSlot[]` (pure)
  - `fetchTomorrowWholesale(): Promise<WholesaleSlot[]>`

- [ ] **Step 1: Write the failing test**

Create `src/features/pricing/api/wholesaleApi.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selectWholesaleSlots } from './wholesaleApi';

const raw = {
  data: [
    { startTime: '2026-07-02T00:30:00Z', dataProvider: 'N2EXMIDP', settlementDate: '2026-07-02', settlementPeriod: 2, price: 55, volume: 10 },
    { startTime: '2026-07-02T00:00:00Z', dataProvider: 'N2EXMIDP', settlementDate: '2026-07-02', settlementPeriod: 1, price: 60, volume: 10 },
    { startTime: '2026-07-02T00:00:00Z', dataProvider: 'APXMIDP', settlementDate: '2026-07-02', settlementPeriod: 1, price: 99, volume: 10 },
    { startTime: '2026-07-02T01:00:00Z', dataProvider: 'APXMIDP', settlementDate: '2026-07-02', settlementPeriod: 3, price: 40, volume: 10 },
  ],
};

describe('selectWholesaleSlots', () => {
  it('prefers N2EX, falls back to APX, sorts ascending', () => {
    const slots = selectWholesaleSlots(raw);
    expect(slots.map((s) => s.priceGbpMwh)).toEqual([60, 55, 40]);
    expect(slots[0].startTime).toEqual(new Date('2026-07-02T00:00:00Z'));
    expect(slots[2].startTime).toEqual(new Date('2026-07-02T01:00:00Z'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- wholesaleApi`
Expected: FAIL (`Cannot find module './wholesaleApi'`).

- [ ] **Step 3: Write the implementation**

Create `src/features/pricing/api/wholesaleApi.ts`:

```ts
import wretch from 'wretch';
import dayjs from 'dayjs';
import { z } from 'zod';
import type { WholesaleSlot } from '../schemas';

const PROXY_BASE = '/proxy/wholesale';

const marketIndexResponseSchema = z.object({
  data: z.array(
    z.object({
      startTime: z.string(),
      dataProvider: z.string(),
      settlementDate: z.string(),
      settlementPeriod: z.number(),
      price: z.number(),
      volume: z.number(),
    })
  ),
});

type MarketIndexResponse = z.infer<typeof marketIndexResponseSchema>;

/** Collapse APX/N2EX rows into one price per half-hour, preferring N2EX. */
export function selectWholesaleSlots(raw: MarketIndexResponse): WholesaleSlot[] {
  const byTime = new Map<string, { n2ex?: number; apx?: number }>();
  for (const d of raw.data) {
    const entry = byTime.get(d.startTime) ?? {};
    if (d.dataProvider === 'N2EXMIDP') entry.n2ex = d.price;
    else if (d.dataProvider === 'APXMIDP') entry.apx = d.price;
    byTime.set(d.startTime, entry);
  }

  return [...byTime.entries()]
    .map(([startTime, p]) => ({
      startTime: new Date(startTime),
      priceGbpMwh: p.n2ex ?? p.apx ?? NaN,
    }))
    .filter((s) => !Number.isNaN(s.priceGbpMwh))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export async function fetchTomorrowWholesale(): Promise<WholesaleSlot[]> {
  const from = dayjs().add(1, 'day').startOf('day');
  const to = dayjs().add(1, 'day').endOf('day');
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    format: 'json',
  });
  const raw = await wretch(`${PROXY_BASE}?${params}`).get().json();
  return selectWholesaleSlots(marketIndexResponseSchema.parse(raw));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- wholesaleApi`
Expected: PASS.

- [ ] **Step 5: Add the dev proxy in vite.config.ts**

In `vite.config.ts`, inside `server.proxy` (after the `/proxy/forecast` entry), add:

```ts
      '/proxy/wholesale': {
        target: 'https://data.elexon.co.uk',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/proxy\/wholesale/,
            '/bmrs/api/v1/balancing/pricing/market-index'
          ),
      },
```

(The query string is preserved automatically; only the path is rewritten.)

- [ ] **Step 6: Add the vercel rewrite**

In `vercel.json`, add this object as the **first** entry of `rewrites` (before `/proxy/forecast`):

```json
    {
      "source": "/proxy/wholesale",
      "destination": "https://data.elexon.co.uk/bmrs/api/v1/balancing/pricing/market-index"
    },
```

- [ ] **Step 7: Verify the proxy end-to-end**

Run: `pnpm dev` then in another shell:
`curl "http://localhost:5174/proxy/wholesale?from=2026-06-30T00:00Z&to=2026-06-30T02:00Z&format=json"`
Expected: JSON with a `data` array of market-index rows. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/features/pricing/api/wholesaleApi.ts src/features/pricing/api/wholesaleApi.test.ts vite.config.ts vercel.json
git commit -m "feat: add Elexon wholesale API client and proxy"
```

---

### Task 3: Calibrate per-region coefficients + validation fixture

**Files:**
- Create: `scripts/calibrate-agile.ts` (one-off derivation tool)
- Modify: `src/features/pricing/agileFormula.ts` (`REGION_COEFFICIENTS` values)
- Modify: `src/features/pricing/agileFormula.test.ts` (add real-day validation)

**Interfaces:**
- Consumes: `selectWholesaleSlots` (Task 2), `estimateSlots`/`REGION_COEFFICIENTS` (Task 1).
- Produces: calibrated `REGION_COEFFICIENTS` values + a fixture that gates accuracy.

- [ ] **Step 1: Write the calibration script**

Create `scripts/calibrate-agile.ts`. It fetches, for a recent settled day, the Elexon wholesale slots and each region's *confirmed* Octopus rates, then least-squares-fits `agile = D*wholesale + P(peak)` per region and prints a `REGION_COEFFICIENTS` block.

```ts
import { REGIONS } from '../src/features/pricing/schemas';

const DAY = process.argv[2] ?? '2026-06-29'; // a fully settled past day
const ELEXON = 'https://data.elexon.co.uk/bmrs/api/v1/balancing/pricing/market-index';
const OCTO = 'https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs';

const from = `${DAY}T00:00:00Z`;
const to = `${DAY}T23:59:59Z`;

async function wholesaleByStart(): Promise<Map<string, number>> {
  const res = await fetch(`${ELEXON}?from=${from}&to=${to}&format=json`);
  const json = (await res.json()) as { data: { startTime: string; dataProvider: string; price: number }[] };
  const m = new Map<string, number>();
  for (const d of json.data) {
    if (d.dataProvider === 'N2EXMIDP') m.set(new Date(d.startTime).toISOString(), d.price / 10); // p/kWh
  }
  return m;
}

function isPeak(iso: string): boolean {
  const h = new Date(iso).getHours();
  return h >= 16 && h < 19;
}

// Solve agile = D*w + P*peak by least squares over [w, peakFlag] -> agile.
function fit(rows: { w: number; peak: number; y: number }[]): { multiplier: number; peakUplift: number } {
  // Normal equations for two predictors (w, peak), no intercept.
  let sww = 0, swp = 0, spp = 0, swy = 0, spy = 0;
  for (const r of rows) {
    sww += r.w * r.w; swp += r.w * r.peak; spp += r.peak * r.peak;
    swy += r.w * r.y; spy += r.peak * r.y;
  }
  const det = sww * spp - swp * swp;
  const D = (spp * swy - swp * spy) / det;
  const P = (sww * spy - swp * swy) / det;
  return { multiplier: Number(D.toFixed(4)), peakUplift: Number(P.toFixed(3)) };
}

const wholesale = await wholesaleByStart();
const out: Record<string, unknown> = {};
for (const region of REGIONS) {
  const tariff = `E-1R-AGILE-24-10-01-${region}`;
  const res = await fetch(`${OCTO}/${tariff}/standard-unit-rates/?period_from=${from}&period_to=${to}&page_size=100`);
  const json = (await res.json()) as { results: { valid_from: string; value_inc_vat: number }[] };
  const rows: { w: number; peak: number; y: number }[] = [];
  for (const r of json.results) {
    const w = wholesale.get(new Date(r.valid_from).toISOString());
    if (w === undefined) continue;
    rows.push({ w, peak: isPeak(r.valid_from) ? 1 : 0, y: r.value_inc_vat });
  }
  out[region] = rows.length ? fit(rows) : 'NO DATA';
}
console.log(JSON.stringify(out, null, 2));
```

- [ ] **Step 2: Run the calibration**

Run: `pnpm tsx scripts/calibrate-agile.ts 2026-06-29`
Expected: a JSON object mapping each region A–P to `{ multiplier, peakUplift }`.
If a region prints `"NO DATA"`, re-run with a different recent settled date until all regions return numbers.

- [ ] **Step 3: Paste the calibrated values into `REGION_COEFFICIENTS`**

Replace each `{ ...SEED }` in `src/features/pricing/agileFormula.ts` with the fitted `{ multiplier, peakUplift }` for that region from the script output. Remove the now-unused `SEED` constant.

- [ ] **Step 4: Add the validation fixture test**

Capture 3 real confirmed half-hours for region C on the calibration day (from the Octopus URL in the script) plus their wholesale p/kWh, and append to `src/features/pricing/agileFormula.test.ts`:

```ts
describe('validation against a real settled day (region C)', () => {
  // Values captured from the calibration run for 2026-06-29 (region C).
  // Replace w/y with the actual captured numbers for one off-peak, one peak slot.
  const cases: { iso: string; wPerKwh: number; confirmed: number }[] = [
    { iso: '2026-06-29T03:00:00Z', wPerKwh: /*fill*/ 0, confirmed: /*fill*/ 0 },
    { iso: '2026-06-29T17:30:00Z', wPerKwh: /*fill*/ 0, confirmed: /*fill*/ 0 },
  ];

  it('reproduces confirmed rates within tolerance', () => {
    for (const c of cases) {
      const est = wholesaleToAgile(c.wPerKwh, new Date(c.iso), 'C');
      const tol = new Date(c.iso).getHours() >= 16 && new Date(c.iso).getHours() < 19 ? 3 : 1;
      expect(Math.abs(est - c.confirmed)).toBeLessThanOrEqual(tol);
    }
  });
});
```

Fill the `wPerKwh`/`confirmed` values from the captured data before running.

- [ ] **Step 5: Run the full formula test**

Run: `pnpm test -- agileFormula`
Expected: PASS, including the validation cases within tolerance. If the peak case exceeds tolerance, the peak window or `peakUplift` needs revisiting, do not loosen the tolerance beyond ±3p peak / ±1p off-peak without noting why.

- [ ] **Step 6: Commit**

```bash
git add scripts/calibrate-agile.ts src/features/pricing/agileFormula.ts src/features/pricing/agileFormula.test.ts
git commit -m "feat: calibrate per-region Agile coefficients against real data"
```

---

### Task 4: use-estimate hook

**Files:**
- Create: `src/features/pricing/hooks/use-estimate.ts`

**Interfaces:**
- Consumes: `fetchTomorrowWholesale` (Task 2), `estimateSlots` (Task 1), `calcStats` (`../api/octopusApi`), `errorMessage` (`../../../lib/errors`).
- Produces: `useEstimate(region: Region, enabled: boolean): { estimate: DailyPrices | null; loading: boolean; error: string | null }`

- [ ] **Step 1: Write the hook**

Create `src/features/pricing/hooks/use-estimate.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchTomorrowWholesale } from '../api/wholesaleApi';
import { estimateSlots } from '../agileFormula';
import { calcStats } from '../api/octopusApi';
import { errorMessage } from '../../../lib/errors';
import type { Region, DailyPrices } from '../schemas';

const ONE_HOUR = 60 * 60_000;

export function useEstimate(region: Region, enabled: boolean) {
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  const { data, isLoading, error } = useQuery({
    queryKey: ['estimate', region, tomorrow] as const,
    enabled: enabled && !!region,
    staleTime: ONE_HOUR,
    queryFn: async (): Promise<DailyPrices> => {
      const wholesale = await fetchTomorrowWholesale();
      const rates = estimateSlots(wholesale, region);
      return { date: tomorrow, rates, stats: calcStats(rates) };
    },
  });

  return {
    estimate: data && data.rates.length > 0 ? data : null,
    loading: enabled && !!region && isLoading,
    error: errorMessage(error),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/features/pricing/hooks/use-estimate.ts
git commit -m "feat: add use-estimate hook"
```

---

### Task 5: RateSourceBadge + Tomorrow-tab integration

**Files:**
- Create: `src/features/pricing/components/RateSourceBadge/index.tsx`
- Modify: `src/features/pricing/components/Dashboard/index.tsx`

**Interfaces:**
- Consumes: `useEstimate` (Task 4), `DaySection` (existing, in Dashboard).
- Produces: `RateSourceBadge({ variant: 'estimate' | 'confirmed' })`

- [ ] **Step 1: Write the badge component**

Create `src/features/pricing/components/RateSourceBadge/index.tsx`:

```tsx
import { Badge } from '@mantine/core';

export function RateSourceBadge({
  variant,
}: {
  variant: 'estimate' | 'confirmed';
}) {
  return variant === 'estimate' ? (
    <Badge color="violet" variant="light" radius="sm">
      🔮 Estimate
    </Badge>
  ) : (
    <Badge color="green" variant="light" radius="sm">
      ✓ Confirmed
    </Badge>
  );
}
```

- [ ] **Step 2: Import the hook and badge in Dashboard**

In `src/features/pricing/components/Dashboard/index.tsx`, add imports near the other feature imports:

```ts
import { useEstimate } from '../../hooks/use-estimate';
import { RateSourceBadge } from '../RateSourceBadge';
```

- [ ] **Step 3: Call the hook**

After the `const usage = useUsage(...)` / `const notifications = ...` hook calls in `PricingDashboard`, add:

```ts
  const estimate = useEstimate(currentRegion, !hasTomorrow);
```

(`hasTomorrow` is already defined above as `(tomorrowData?.rates.length ?? 0) > 0`.)

- [ ] **Step 4: Replace the Tomorrow panel body**

Find the `<Tabs.Panel value="tomorrow">` block and replace its contents with:

```tsx
            <Tabs.Panel value="tomorrow">
              {hasTomorrow && tomorrowData ? (
                <>
                  <Group justify="flex-end" mb="xs">
                    <RateSourceBadge variant="confirmed" />
                  </Group>
                  <DaySection data={tomorrowData} loading={loading} />
                </>
              ) : estimate.estimate ? (
                <>
                  <Group justify="space-between" align="center" mb="xs">
                    <Text size="xs" c="dimmed">
                      Estimate from wholesale prices, Octopus confirms
                      tomorrow's rates around 4pm
                    </Text>
                    <RateSourceBadge variant="estimate" />
                  </Group>
                  <DaySection data={estimate.estimate} loading={estimate.loading} />
                </>
              ) : (
                <Paper
                  p="xl"
                  radius="lg"
                  withBorder
                  className={styles.emptyState}
                >
                  <Stack align="center" gap="xs">
                    <Text fw={600}>Tomorrow's rates not yet available</Text>
                    <Text size="sm" c="dimmed">
                      Octopus publishes the next day's prices around 4pm
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Tabs.Panel>
```

(`Group`, `Text`, `Paper`, `Stack` are already imported in Dashboard.)

- [ ] **Step 5: Typecheck, lint, build**

Run: `npx tsc -b && pnpm lint && pnpm build`
Expected: all exit 0.

- [ ] **Step 6: Manual verification**

Run: `pnpm dev`, open the app, pick a region, open the **Tomorrow** tab.
- If Octopus has published tomorrow's rates → "✓ Confirmed" badge + rates.
- If not yet published but the auction has cleared → "🔮 Estimate" badge, the banner text, and a populated chart/heatmap/table.
- Before the auction clears / no data → the "not yet available" empty state.
Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/features/pricing/components/RateSourceBadge/index.tsx src/features/pricing/components/Dashboard/index.tsx
git commit -m "feat: show labelled wholesale estimate on the Tomorrow tab"
```

---

### Task 6: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the estimate + data source**

In `README.md`, under the **Electricity (Agile)** feature list, add a bullet:

```markdown
- **Tomorrow before 4pm**: a wholesale-derived *estimate* of tomorrow's rates
  (clearly labelled 🔮 Estimate), computed from the GB day-ahead market index
  and the Agile formula; automatically replaced by Octopus's ✓ Confirmed rates
  when they publish (~4pm).
```

And under **Data sources**, add:

```markdown
- [Elexon BMRS](https://bmrs.elexon.co.uk/), GB day-ahead market index prices,
  used to estimate tomorrow's Agile rates before Octopus publishes them.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document the wholesale tomorrow estimate"
```

---

## Self-Review

**Spec coverage:**
- Elexon data source + proxy → Task 2 ✅
- Client-side compute, static SPA → Tasks 1/2/4 (no server changes) ✅
- Formula `min(D×w+P, cap)`, peak 16:00–19:00, £/MWh→p/kWh → Task 1 ✅
- Provider N2EX→APX fallback → Task 2 ✅
- Coefficient seeding + validation fixture + empirical derivation → Task 3 ✅
- Tomorrow-tab confirmed/estimate/empty states → Task 5 ✅
- Mandatory Estimate/Confirmed labelling → Task 5 (badge) ✅
- Estimate query disabled once confirmed exists (`!hasTomorrow`) → Task 4/5 ✅
- Reuse `DailyPrices`/`ProcessedSlot` (no new chart code) → Task 1 `estimateSlots` + Task 5 ✅
- Tests for pure logic only → Tasks 1/2/3 ✅
- README mentions estimate + Elexon → Task 6 ✅
- Out-of-scope items (archive, accuracy dashboard, runtime auto-tune) → not present ✅

**Placeholder scan:** The only intentional "fill" is the captured real numbers in Task 3 Step 4 (impossible to know before running the calibration), the step gives exact instructions to obtain and insert them.

**Type consistency:** `WholesaleSlot { startTime: Date; priceGbpMwh: number }` defined in Task 1 and consumed identically in Tasks 2/4. `estimateSlots`, `wholesaleToAgile`, `selectWholesaleSlots`, `fetchTomorrowWholesale`, `useEstimate`, `RateSourceBadge` signatures match across all consuming tasks. `calcStats` is imported from `../api/octopusApi` where it is already exported.
