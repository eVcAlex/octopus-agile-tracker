import wretch from 'wretch';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { z } from 'zod';
import type { WholesaleSlot } from '../schemas';

dayjs.extend(utc);
dayjs.extend(timezone);

const PROXY_BASE = '/proxy/wholesale';
const LONDON = 'Europe/London';

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
 * Expand hourly prices into 48 half-hourly slots covering the 24 hours from
 * `dayStart` (an exact instant, e.g. UK midnight). Each half-hour inherits its
 * containing hour's day-ahead price; slots whose hour is missing are dropped.
 */
export function halfHourlySlots(
  hours: Map<string, number>,
  dayStart: Date
): WholesaleSlot[] {
  const slots: WholesaleSlot[] = [];
  for (let i = 0; i < 48; i++) {
    const t = dayStart.getTime() + i * 30 * 60_000;
    const hourStart = new Date(Math.floor(t / 3_600_000) * 3_600_000);
    const price = hours.get(hourStart.toISOString());
    if (price === undefined) continue;
    slots.push({ startTime: new Date(t), priceGbpMwh: price });
  }
  return slots;
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
  // Anchor "tomorrow" to the UK civil day so the estimate covers the same day
  // as Octopus's confirmed rates, regardless of the client's timezone.
  const ukTomorrow = dayjs().tz(LONDON).add(1, 'day').startOf('day');

  // Only tomorrow's auction is published pre-4pm (the day after is not), so we
  // fetch just tomorrow. A late-evening hour falling outside the CET delivery
  // day may be absent — halfHourlySlots drops any uncovered half-hour.
  const hours = parseNordpoolHours(
    await fetchDay(ukTomorrow.format('YYYY-MM-DD'))
  );
  return halfHourlySlots(hours, ukTomorrow.toDate());
}
