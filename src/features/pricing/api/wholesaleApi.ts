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
