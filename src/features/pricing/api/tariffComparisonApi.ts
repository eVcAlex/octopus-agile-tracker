import wretch from 'wretch';
import { z } from 'zod';
import type { Region } from '../schemas';
import type { ConsumptionEntry } from './consumptionApi';
import {
  PRODUCTS_BASE,
  isDirectDebit,
  currentStandingCharge,
} from './octopusClient';

// ─── Types ───

interface SpanRow {
  valid_from: string;
  valid_to: string | null;
  value_inc_vat: number;
}

export interface TariffCost {
  key: string;
  label: string;
  /** Unit cost over the window, pence. */
  unitCost: number;
  /** Standing charge over the window, pence. */
  standingCharge: number;
  /** unitCost + standingCharge, pence. */
  totalCost: number;
}

const spanRowSchema = z.object({
  value_inc_vat: z.number(),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
  payment_method: z.string().nullable().optional(),
});

const ratesResponseSchema = z.object({
  results: z.array(spanRowSchema),
});

const productsResponseSchema = z.object({
  results: z.array(
    z.object({
      code: z.string(),
      display_name: z.string().optional(),
      is_variable: z.boolean().optional(),
    })
  ),
});

// Tracker was withdrawn from sale so it no longer appears in the products
// list, but existing versions still price daily. Newest first.
const TRACKER_CODES = ['SILVER-25-09-02', 'SILVER-24-10-01'];

// Require most of the usage to be priced before showing a tariff.
const MIN_COVERAGE = 0.9;

// ─── Pure costing ───

/**
 * Price half-hourly consumption against a tariff's rate spans. Slots not
 * covered by any span (e.g. a fixed tariff that launched mid-window) fall
 * back to the tariff's most recent daily pattern by UTC time-of-day, so
 * banded tariffs like Go apply their current structure retrospectively.
 */
export function costAgainstSpans(
  consumption: ConsumptionEntry[],
  spans: SpanRow[]
): { unitCost: number; coveredKwh: number; totalKwh: number } {
  const sorted = [...spans].sort(
    (a, b) =>
      new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime()
  );

  // Daily pattern from the most recent sub-24h spans (banded tariffs).
  const pattern = sorted
    .slice(-12)
    .filter((s) => {
      if (!s.valid_to) return false;
      const dur =
        new Date(s.valid_to).getTime() - new Date(s.valid_from).getTime();
      return dur > 0 && dur <= 24 * 3_600_000;
    })
    .map((s) => {
      const from = new Date(s.valid_from);
      const to = new Date(s.valid_to as string);
      return {
        startMin: from.getUTCHours() * 60 + from.getUTCMinutes(),
        endMin: to.getUTCHours() * 60 + to.getUTCMinutes(),
        rate: s.value_inc_vat,
      };
    })
    .reverse(); // most recent first

  const patternRate = (t: Date): number | undefined => {
    const min = t.getUTCHours() * 60 + t.getUTCMinutes();
    for (const b of pattern) {
      const wraps = b.startMin >= b.endMin;
      const hit = wraps
        ? min >= b.startMin || min < b.endMin
        : min >= b.startMin && min < b.endMin;
      if (hit) return b.rate;
    }
    return undefined;
  };

  let unitCost = 0;
  let coveredKwh = 0;
  let totalKwh = 0;

  for (const e of consumption) {
    totalKwh += e.consumption;
    const t = new Date(e.interval_start);
    const ts = t.getTime();
    const direct = sorted.find(
      (s) =>
        new Date(s.valid_from).getTime() <= ts &&
        (s.valid_to === null || new Date(s.valid_to).getTime() > ts)
    );
    const rate = direct ? direct.value_inc_vat : patternRate(t);
    if (rate === undefined) continue;
    unitCost += e.consumption * rate;
    coveredKwh += e.consumption;
  }

  return { unitCost, coveredKwh, totalKwh };
}

// ─── Fetchers ───

async function fetchSpans(
  code: string,
  region: Region,
  from: Date,
  to: Date
): Promise<SpanRow[]> {
  const tariff = `E-1R-${code}-${region}`;
  const params = new URLSearchParams({
    period_from: from.toISOString(),
    period_to: to.toISOString(),
    page_size: '1500',
  });
  const raw = await wretch(
    `${PRODUCTS_BASE}/${code}/electricity-tariffs/${tariff}/standard-unit-rates/?${params}`
  )
    .get()
    .json();
  return ratesResponseSchema.parse(raw).results.filter(isDirectDebit);
}

async function fetchStandingCharge(
  code: string,
  region: Region
): Promise<number | null> {
  const tariff = `E-1R-${code}-${region}`;
  const raw = await wretch(
    `${PRODUCTS_BASE}/${code}/electricity-tariffs/${tariff}/standing-charges/?page_size=10`
  )
    .get()
    .json();
  const parsed = z
    .object({
      results: z.array(spanRowSchema.extend({ value_exc_vat: z.number() })),
    })
    .parse(raw);
  return currentStandingCharge(parsed.results);
}

interface Candidate {
  key: string;
  label: string;
  code: string;
}

/**
 * Discover current comparison candidates from the public products list. The
 * caller drops whichever one matches the user's own tariff.
 */
async function discoverCandidates(): Promise<Candidate[]> {
  const raw = await wretch(
    `${PRODUCTS_BASE}/?brand=OCTOPUS_ENERGY&page_size=250`
  )
    .get()
    .json();
  const products = productsResponseSchema.parse(raw).results;

  const byPrefix = (prefix: string, preferVariable = false) => {
    const matches = products.filter((p) => p.code.startsWith(prefix));
    if (!matches.length) return null;
    return (preferVariable && matches.find((p) => p.is_variable)) || matches[0];
  };

  const candidates: Candidate[] = [];
  const agile = byPrefix('AGILE-', true);
  if (agile)
    candidates.push({ key: 'agile', label: 'Agile', code: agile.code });
  const flexible = byPrefix('VAR-', true);
  if (flexible)
    candidates.push({
      key: 'flexible',
      label: 'Flexible',
      code: flexible.code,
    });
  const go = byPrefix('GO-');
  if (go) candidates.push({ key: 'go', label: 'Go (EV)', code: go.code });
  const cosy = byPrefix('COSY-', true);
  if (cosy) candidates.push({ key: 'cosy', label: 'Cosy', code: cosy.code });
  // Tracker is unlisted, so it is probed directly in fetchTariffComparison.
  return candidates;
}

async function costCandidate(
  c: Candidate,
  region: Region,
  consumption: ConsumptionEntry[],
  from: Date,
  to: Date,
  days: number
): Promise<TariffCost | null> {
  try {
    const [spans, sc] = await Promise.all([
      fetchSpans(c.code, region, from, to),
      fetchStandingCharge(c.code, region),
    ]);
    const { unitCost, coveredKwh, totalKwh } = costAgainstSpans(
      consumption,
      spans
    );
    if (!totalKwh || coveredKwh / totalKwh < MIN_COVERAGE) return null;
    const standingCharge = (sc ?? 0) * days;
    return {
      key: c.key,
      label: c.label,
      unitCost,
      standingCharge,
      totalCost: unitCost + standingCharge,
    };
  } catch {
    return null; // tariff unavailable in this region, skip
  }
}

/**
 * What the same half-hourly usage would have cost on other Octopus tariffs
 * (unit rates + standing charge), sorted cheapest first. Best-effort: tariffs
 * that are unavailable or can't price ≥90% of the usage are omitted.
 */
export async function fetchTariffComparison(
  region: Region,
  consumption: ConsumptionEntry[],
  from: Date,
  to: Date,
  days: number
): Promise<TariffCost[]> {
  const discovered = await discoverCandidates();

  const candidates = [...discovered];
  for (const code of TRACKER_CODES) {
    candidates.push({ key: `tracker-${code}`, label: 'Tracker', code });
  }

  const costs = await Promise.all(
    candidates.map((c) => costCandidate(c, region, consumption, from, to, days))
  );

  // Keep the first (newest) Tracker version that priced successfully.
  const result: TariffCost[] = [];
  let trackerTaken = false;
  for (const cost of costs) {
    if (!cost) continue;
    if (cost.key.startsWith('tracker')) {
      if (trackerTaken) continue;
      trackerTaken = true;
      result.push({ ...cost, key: 'tracker' });
    } else {
      result.push(cost);
    }
  }

  return result.sort((a, b) => a.totalCost - b.totalCost);
}
