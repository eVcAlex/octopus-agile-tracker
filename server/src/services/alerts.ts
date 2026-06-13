import type { Region, StoredSubscription } from '../schemas.js';
import { fetchTodayRates, fetchTomorrowRates } from './octopus.js';
import { findCheapestWindow } from './cheapWindow.js';
import { listSubscriptions, claimOnce } from './store.js';
import { sendPush } from './push.js';

const DAY_TTL = 60 * 60 * 36; // 36h dedupe window

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

function byRegion(
  subs: StoredSubscription[]
): Map<Region, StoredSubscription[]> {
  const map = new Map<Region, StoredSubscription[]>();
  for (const s of subs) {
    const bucket = map.get(s.prefs.region);
    if (bucket) bucket.push(s);
    else map.set(s.prefs.region, [s]);
  }
  return map;
}

export interface AlertRunResult {
  regionsChecked: number;
  notificationsSent: number;
}

/**
 * "Tomorrow's rates published" + plunge-pricing alerts. Run a few times
 * around 4pm UK; dedupe keys ensure each fires at most once per day.
 */
export async function runRatesPublishedAlerts(): Promise<AlertRunResult> {
  const subs = (await listSubscriptions()).filter(
    (s) => s.prefs.ratesPublished || s.prefs.plunge
  );
  const regions = byRegion(subs);
  let sent = 0;

  for (const [region, regionSubs] of regions) {
    const rates = await fetchTomorrowRates(region);
    // Treat the day as published once a full schedule is up (≥40 slots)
    if (rates.length < 40) continue;

    const date = rates[0].valid_from.slice(0, 10);
    const prices = rates.map((r) => r.value_inc_vat);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const min = Math.min(...prices);
    const minSlot = rates[prices.indexOf(min)];

    if (await claimOnce(`rates:${region}:${date}`, DAY_TTL)) {
      const payload = {
        title: "Tomorrow's Agile rates are out",
        body: `Average ${avg.toFixed(1)}p/kWh · cheapest ${min.toFixed(1)}p at ${fmtTime(new Date(minSlot.valid_from))}`,
        tag: `rates-${date}`,
        url: '/',
      };
      for (const sub of regionSubs.filter((s) => s.prefs.ratesPublished)) {
        if (await sendPush(sub, payload)) sent++;
      }
    }

    if (min < 0 && (await claimOnce(`plunge:${region}:${date}`, DAY_TTL))) {
      const payload = {
        title: 'Plunge pricing tomorrow ⚡',
        body: `Prices go negative — down to ${min.toFixed(1)}p/kWh at ${fmtTime(new Date(minSlot.valid_from))}. You get paid to use power.`,
        tag: `plunge-${date}`,
        url: '/',
      };
      for (const sub of regionSubs.filter((s) => s.prefs.plunge)) {
        if (await sendPush(sub, payload)) sent++;
      }
    }
  }

  return { regionsChecked: regions.size, notificationsSent: sent };
}

const WINDOW_LOOKAHEAD_MS = 30 * 60_000;

/**
 * "Cheap window starting soon" alerts. Run every ~15 minutes; notifies each
 * subscriber once per window start.
 */
export async function runCheapWindowAlerts(
  now: Date = new Date()
): Promise<AlertRunResult> {
  const subs = (await listSubscriptions()).filter((s) => s.prefs.cheapWindow);
  const regions = byRegion(subs);
  let sent = 0;

  for (const [region, regionSubs] of regions) {
    const rates = await fetchTodayRates(region);

    for (const sub of regionSubs) {
      const win = findCheapestWindow(
        rates,
        sub.prefs.cheapWindowHours * 2,
        now
      );
      if (!win) continue;

      const startsInMs = win.start.getTime() - now.getTime();
      if (startsInMs <= 0 || startsInMs > WINDOW_LOOKAHEAD_MS) continue;

      const key = `window:${sub.id}:${win.start.toISOString()}`;
      if (!(await claimOnce(key, DAY_TTL))) continue;

      const mins = Math.round(startsInMs / 60_000);
      const ok = await sendPush(sub, {
        title: `Cheap ${sub.prefs.cheapWindowHours}h window in ${mins} min`,
        body: `${fmtTime(win.start)}–${fmtTime(win.end)} · avg ${win.avgPrice.toFixed(1)}p/kWh — today's cheapest ${sub.prefs.cheapWindowHours}h run.`,
        tag: `window-${win.start.toISOString()}`,
        url: '/',
      });
      if (ok) sent++;
    }
  }

  return { regionsChecked: regions.size, notificationsSent: sent };
}
