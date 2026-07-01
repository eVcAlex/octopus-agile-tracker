import wretch from 'wretch';
import { z } from 'zod';
import type { WholesaleSlot } from '../schemas';

const PROXY_BASE = '/proxy/wholesale';

// Nord Pool N2EX day-ahead auction — hourly £/MWh prices per delivery area.
const nordpoolSchema = z.object({
  multiAreaEntries: z.array(
    z.object({
      deliveryStart: z.string(),
      deliveryEnd: z.string(),
      entryPerArea: z.record(z.string(), z.number()),
    })
  ),
});

type Nordpool = z.infer<typeof nordpoolSchema>;

/** Map each hour's UTC ISO start → UK day-ahead price in £/MWh. */
export function parseNordpoolHours(raw: Nordpool): Map<string, number> {
  const hours = new Map<string, number>();
  for (const e of raw.multiAreaEntries) {
    const uk = e.entryPerArea.UK;
    if (uk === undefined) continue;
    hours.set(new Date(e.deliveryStart).toISOString(), uk);
  }
  return hours;
}

/**
 * Expand hourly prices into 48 half-hourly slots covering `day`'s local
 * calendar day. Each half-hour inherits its containing hour's day-ahead price;
 * slots whose hour is missing are dropped.
 */
export function halfHourlySlots(
  hours: Map<string, number>,
  day: Date
): WholesaleSlot[] {
  const slots: WholesaleSlot[] = [];
  for (let i = 0; i < 48; i++) {
    const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    from.setMinutes(i * 30);
    const hourStart = new Date(from);
    hourStart.setMinutes(0, 0, 0);
    const price = hours.get(hourStart.toISOString());
    if (price === undefined) continue;
    slots.push({ startTime: from, priceGbpMwh: price });
  }
  return slots;
}

function dayParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

async function fetchDay(date: string): Promise<Nordpool> {
  const raw = await wretch(
    `${PROXY_BASE}?date=${date}&market=N2EX_DayAhead&deliveryArea=UK&currency=GBP`
  )
    .get()
    .json();
  return nordpoolSchema.parse(raw);
}

export async function fetchTomorrowWholesale(): Promise<WholesaleSlot[]> {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const dayAfter = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 2
  );

  // Fetch tomorrow and the following day so every UTC hour of tomorrow's local
  // day is covered regardless of the CET/UTC delivery-date offset.
  const [a, b] = await Promise.all([
    fetchDay(dayParam(tomorrow)),
    fetchDay(dayParam(dayAfter)),
  ]);
  const hours = parseNordpoolHours(a);
  for (const [k, v] of parseNordpoolHours(b)) hours.set(k, v);

  return halfHourlySlots(hours, tomorrow);
}
