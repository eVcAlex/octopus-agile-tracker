import type { Region, StoredSubscription } from '../schemas.js';
import { fetchTodayRates, fetchTomorrowRates } from './octopus.js';
import { findCheapestWindow } from './cheapWindow.js';
import { listSubscriptions, claimOnce } from './store.js';
import { sendPush } from './push.js';
import { ukDateString } from './ukTime.js';

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
  /** Subscribers eligible for this kind of alert, before any filtering. */
  subscribers: number;
  /** Why nothing (or something) was sent, so a silent run can be debugged. */
  notes: string[];
}

// Agile publishes tomorrow's rates around 16:00 UK; keep trying until evening.
const PUBLISH_WINDOW_START_HOUR = 15;
const PUBLISH_WINDOW_END_HOUR = 21;

/** True during the UK-time hours when tomorrow's rates get published. */
export function inRatesPublishWindow(now: Date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Europe/London',
    }).format(now)
  );
  return hour >= PUBLISH_WINDOW_START_HOUR && hour < PUBLISH_WINDOW_END_HOUR;
}

/**
 * "Tomorrow's rates published" + plunge-pricing alerts. Run every ~15 minutes
 * across the publish window; dedupe keys ensure each fires at most once per
 * day, so extra runs are harmless and a run before publication just retries.
 */
export async function runRatesPublishedAlerts(): Promise<AlertRunResult> {
  const subs = (await listSubscriptions()).filter(
    (s) => s.prefs.ratesPublished || s.prefs.plunge
  );
  const regions = byRegion(subs);
  const notes: string[] = [];
  let sent = 0;

  if (subs.length === 0) {
    notes.push('No subscribers with rates or plunge alerts enabled');
  }

  for (const [region, regionSubs] of regions) {
    const rates = await fetchTomorrowRates(region);
    // Treat the day as published once a full schedule is up (≥40 slots)
    if (rates.length < 40) {
      notes.push(
        `${region}: tomorrow not published yet (${rates.length} slots)`
      );
      continue;
    }

    const date = ukDateString(new Date(rates[0].valid_from));
    const prices = rates.map((r) => r.value_inc_vat);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const min = Math.min(...prices);
    const minSlot = rates[prices.indexOf(min)];

    if (await claimOnce(`rates:${region}:${date}`, DAY_TTL)) {
      const payload = {
        title: "Tomorrow's rates ⚡",
        body: `Average ${avg.toFixed(1)}p/kWh · cheapest ${min.toFixed(1)}p at ${fmtTime(new Date(minSlot.valid_from))}`,
        tag: `rates-${date}`,
        url: '/',
      };
      let ok = 0;
      for (const sub of regionSubs.filter((s) => s.prefs.ratesPublished)) {
        if (await sendPush(sub, payload)) {
          sent++;
          ok++;
        }
      }
      notes.push(`${region}: rates alert for ${date} sent to ${ok}`);
    } else {
      notes.push(`${region}: rates alert for ${date} already sent`);
    }

    if (min < 0 && (await claimOnce(`plunge:${region}:${date}`, DAY_TTL))) {
      const payload = {
        title: 'Plunge tomorrow ⚡',
        body: `Prices go negative, down to ${min.toFixed(1)}p/kWh at ${fmtTime(new Date(minSlot.valid_from))}.`,
        tag: `plunge-${date}`,
        url: '/',
      };
      let ok = 0;
      for (const sub of regionSubs.filter((s) => s.prefs.plunge)) {
        if (await sendPush(sub, payload)) {
          sent++;
          ok++;
        }
      }
      notes.push(`${region}: plunge alert for ${date} sent to ${ok}`);
    }
  }

  return {
    regionsChecked: regions.size,
    notificationsSent: sent,
    subscribers: subs.length,
    notes,
  };
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
  const notes: string[] = [];
  let sent = 0;

  if (subs.length === 0) {
    notes.push('No subscribers with cheap-window alerts enabled');
  }

  for (const [region, regionSubs] of regions) {
    const rates = await fetchTodayRates(region);
    let regionSent = 0;
    let notDue = 0;

    for (const sub of regionSubs) {
      const win = findCheapestWindow(
        rates,
        sub.prefs.cheapWindowHours * 2,
        now
      );
      const startsInMs = win ? win.start.getTime() - now.getTime() : null;
      if (
        !win ||
        startsInMs === null ||
        startsInMs <= 0 ||
        startsInMs > WINDOW_LOOKAHEAD_MS
      ) {
        notDue++;
        continue;
      }

      const key = `window:${sub.id}:${win.start.toISOString()}`;
      if (!(await claimOnce(key, DAY_TTL))) continue;

      const mins = Math.round(startsInMs / 60_000);
      const ok = await sendPush(sub, {
        title: 'Cheap window soon',
        body: `${sub.prefs.cheapWindowHours}h from ${fmtTime(win.start)} (in ${mins} min) · avg ${win.avgPrice.toFixed(1)}p/kWh`,
        tag: `window-${win.start.toISOString()}`,
        url: '/',
      });
      if (ok) {
        sent++;
        regionSent++;
      }
    }

    notes.push(
      `${region}: ${regionSubs.length} subscriber(s), ${regionSent} sent, ${notDue} not due (cheapest window not starting within 30 min)`
    );
  }

  return {
    regionsChecked: regions.size,
    notificationsSent: sent,
    subscribers: subs.length,
    notes,
  };
}
