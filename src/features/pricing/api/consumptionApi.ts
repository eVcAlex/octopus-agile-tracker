import wretch from 'wretch';
import dayjs from 'dayjs';
import { z } from 'zod';
import type { OctopusRate } from '../schemas';

const API_BASE = 'https://api.octopus.energy/v1';

// ─── Schema ───

const consumptionEntrySchema = z.object({
  consumption: z.number(),
  interval_start: z.string(),
  interval_end: z.string(),
});

const consumptionResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(consumptionEntrySchema),
});

export type ConsumptionEntry = z.infer<typeof consumptionEntrySchema>;

const productsResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  results: z.array(z.object({ code: z.string() })),
});

const unitRatesResponseSchema = z.object({
  results: z.array(
    z.object({
      value_inc_vat: z.number(),
      valid_from: z.string(),
      valid_to: z.string().nullable(),
      payment_method: z.string().nullable().optional(),
    })
  ),
});

/**
 * Current Flexible Octopus (standard variable) unit rate for a region, in
 * p/kWh inc VAT. Used as the "what would I pay on a flat tariff" baseline.
 */
export async function fetchFlexibleRate(
  region: string
): Promise<number | null> {
  const raw = await wretch(
    `${API_BASE}/products/?is_variable=true&brand=OCTOPUS_ENERGY&page_size=100`
  )
    .get()
    .json();
  const products = productsResponseSchema.parse(raw);
  const flexible = products.results.find((p) => p.code.startsWith('FLEXIBLE'));
  if (!flexible) return null;

  const tariff = `E-1R-${flexible.code}-${region}`;
  const ratesRaw = await wretch(
    `${API_BASE}/products/${flexible.code}/electricity-tariffs/${tariff}/standard-unit-rates/?page_size=10`
  )
    .get()
    .json();
  const rates = unitRatesResponseSchema.parse(ratesRaw);

  const now = new Date();
  const current = rates.results
    .filter(
      (r) => r.payment_method === 'DIRECT_DEBIT' || r.payment_method == null
    )
    .find(
      (r) =>
        new Date(r.valid_from) <= now &&
        (r.valid_to === null || new Date(r.valid_to) > now)
    );
  return current?.value_inc_vat ?? null;
}

export async function fetchConsumption(
  apiKey: string,
  mpan: string,
  serial: string,
  from: Date,
  to: Date
): Promise<ConsumptionEntry[]> {
  const params = new URLSearchParams({
    period_from: from.toISOString(),
    period_to: to.toISOString(),
    page_size: '25000',
    order_by: 'period',
  });
  const url = `${API_BASE}/electricity-meter-points/${mpan}/meters/${serial}/consumption/?${params}`;

  const raw = await wretch(url)
    .auth(`Basic ${btoa(apiKey + ':')}`)
    .get()
    .json();

  return consumptionResponseSchema.parse(raw).results;
}

// ─── Spend calculation (pure) ───

export interface DailySpend {
  date: string;
  kwh: number;
  agileCost: number; // pence
  flatCost: number; // pence at the comparison flat rate
}

export interface SpendSummary {
  days: DailySpend[];
  totalKwh: number;
  totalAgileCost: number; // pence
  totalFlatCost: number; // pence
}

/**
 * Joins half-hourly consumption with Agile rates (matched on interval start)
 * and totals cost per day. Slots without a matching rate are skipped.
 */
export function calcSpend(
  consumption: ConsumptionEntry[],
  rates: OctopusRate[],
  flatRate: number
): SpendSummary {
  const priceByStart = new Map<number, number>();
  for (const r of rates) {
    priceByStart.set(new Date(r.valid_from).getTime(), r.value_inc_vat);
  }

  const byDay = new Map<string, { kwh: number; agileCost: number }>();
  for (const entry of consumption) {
    const price = priceByStart.get(new Date(entry.interval_start).getTime());
    if (price === undefined) continue;
    const date = dayjs(entry.interval_start).format('YYYY-MM-DD');
    const day = byDay.get(date) ?? { kwh: 0, agileCost: 0 };
    day.kwh += entry.consumption;
    day.agileCost += entry.consumption * price;
    byDay.set(date, day);
  }

  const days: DailySpend[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { kwh, agileCost }]) => ({
      date,
      kwh,
      agileCost,
      flatCost: kwh * flatRate,
    }));

  return {
    days,
    totalKwh: days.reduce((s, d) => s + d.kwh, 0),
    totalAgileCost: days.reduce((s, d) => s + d.agileCost, 0),
    totalFlatCost: days.reduce((s, d) => s + d.flatCost, 0),
  };
}
