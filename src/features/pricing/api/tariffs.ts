import dayjs from 'dayjs';
import type { OctopusRate, OctopusRateWindow } from '../schemas';
import { isDirectDebit } from './octopusClient';

export const DEFAULT_ELECTRICITY_PRODUCT = 'AGILE-24-10-01';

const HALF_HOUR_MS = 30 * 60_000;

// ─── Tariff identity ───

export function isAgileProduct(product: string): boolean {
  return product.toUpperCase().startsWith('AGILE');
}

export function electricityTariffCode(product: string, region: string) {
  return `E-1R-${product}-${region}`;
}

export interface ParsedTariffCode {
  fuel: 'E' | 'G';
  /** 1 = single register; 2 = day/night (Economy 7 style). */
  registers: 1 | 2;
  product: string;
  region: string;
}

/** "E-1R-AGILE-24-10-01-C" → { fuel: 'E', registers: 1, product, region: 'C' } */
export function parseTariffCode(code: string): ParsedTariffCode | null {
  const m = code.match(/^([EG])-([12])R-(.+)-([A-Z])$/);
  if (!m) return null;
  return {
    fuel: m[1] as 'E' | 'G',
    registers: m[2] === '2' ? 2 : 1,
    product: m[3],
    region: m[4],
  };
}

const TARIFF_FAMILIES: { prefix: string; key: string; name: string }[] = [
  { prefix: 'AGILE', key: 'agile', name: 'Agile' },
  { prefix: 'IOG', key: 'intelligent-go', name: 'Intelligent Go' },
  { prefix: 'INTELLI-VAR', key: 'intelligent-go', name: 'Intelligent Go' },
  { prefix: 'INTELLI-FLUX', key: 'intelligent-flux', name: 'Intelligent Flux' },
  { prefix: 'GO', key: 'go', name: 'Go' },
  { prefix: 'COSY', key: 'cosy', name: 'Cosy' },
  { prefix: 'SNUG', key: 'snug', name: 'Snug' },
  { prefix: 'FLUX', key: 'flux', name: 'Flux' },
  { prefix: 'SILVER', key: 'tracker', name: 'Tracker' },
  { prefix: 'VAR', key: 'flexible', name: 'Flexible' },
  { prefix: 'FLEXIBLE', key: 'flexible', name: 'Flexible' },
  { prefix: 'OE-FIX', key: 'fixed', name: 'Fixed' },
];

function family(product: string) {
  const code = product.toUpperCase();
  return TARIFF_FAMILIES.find((f) => code.startsWith(f.prefix));
}

/** Short human name, falling back to the raw product code. */
export function tariffName(product: string): string {
  return family(product)?.name ?? product;
}

/** Stable key shared with the tariff-comparison candidates. */
export function tariffKey(product: string): string {
  return family(product)?.key ?? product;
}

// ─── Rate windows → half-hour slots ───

const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

/**
 * Expands API rate windows of any width (30 min, multi-hour bands, daily,
 * quarterly, open-ended) into half-hour slots within [from, to). Doing this
 * once at the boundary lets every downstream view treat all tariffs alike.
 * Direct Debit rows win where Octopus lists a row per payment method.
 */
export function expandToSlots(
  windows: OctopusRateWindow[],
  from: Date,
  to: Date
): OctopusRate[] {
  const start = Math.ceil(from.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS;
  const end = to.getTime();
  const slots = new Map<number, OctopusRate>();

  for (const w of windows.filter(isDirectDebit)) {
    const wFrom = new Date(w.valid_from).getTime();
    const wTo = w.valid_to === null ? end : new Date(w.valid_to).getTime();
    const first = Math.max(wFrom, start);
    const last = Math.min(wTo, end);
    for (
      let t = Math.ceil(first / HALF_HOUR_MS) * HALF_HOUR_MS;
      t < last;
      t += HALF_HOUR_MS
    ) {
      slots.set(t, {
        value_exc_vat: w.value_exc_vat,
        value_inc_vat: w.value_inc_vat,
        valid_from: iso(t),
        valid_to: iso(t + HALF_HOUR_MS),
        payment_method: w.payment_method,
      });
    }
  }

  return [...slots.entries()].sort(([a], [b]) => a - b).map(([, s]) => s);
}

// ─── Shape helpers ───

/** True when the day's price moves — false for flat, fixed and Tracker days. */
export function hasIntradayVariation(prices: number[]): boolean {
  if (!prices.length) return false;
  return Math.max(...prices) - Math.min(...prices) > 0.01;
}

/**
 * Time-of-use bands (Go, Cosy, Snug…) repeat daily, so when Octopus hasn't
 * published the next day yet, shifting today's slots forward is a sound guess.
 */
export function projectNextDay(today: OctopusRate[]): OctopusRate[] {
  const shift = (s: string) => dayjs(s).add(1, 'day').toISOString();
  return today.map((r) => ({
    ...r,
    valid_from: shift(r.valid_from),
    valid_to: shift(r.valid_to),
  }));
}

/**
 * Octopus often lists only the first sliver of tomorrow (the night band that
 * began today), so "nothing published" isn't the right test. Fills whichever
 * slots of [dayStart, dayEnd) are missing from today's pattern; published
 * slots always win.
 */
export function completeNextDay(
  published: OctopusRate[],
  today: OctopusRate[],
  dayStart: Date,
  dayEnd: Date
): { rates: OctopusRate[]; projected: boolean } {
  const byStart = new Map<number, OctopusRate>();
  for (const r of projectNextDay(today)) {
    const t = new Date(r.valid_from).getTime();
    if (t >= dayStart.getTime() && t < dayEnd.getTime()) byStart.set(t, r);
  }
  const projectedCount = byStart.size;
  for (const r of published) byStart.set(new Date(r.valid_from).getTime(), r);

  const filled = byStart.size - published.length;
  return {
    rates: [...byStart.entries()].sort(([a], [b]) => a - b).map(([, r]) => r),
    projected: projectedCount > 0 && filled > 0,
  };
}
