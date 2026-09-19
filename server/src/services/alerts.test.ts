import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OctopusRate, StoredSubscription } from '../schemas.js';

vi.mock('./store.js', () => ({
  listSubscriptions: vi.fn(),
  claimOnce: vi.fn(),
}));
vi.mock('./push.js', () => ({ sendPush: vi.fn() }));
vi.mock('./octopus.js', () => ({
  fetchTodayRates: vi.fn(),
  fetchTomorrowRates: vi.fn(),
}));

import {
  inRatesPublishWindow,
  runCheapWindowAlerts,
  runRatesPublishedAlerts,
} from './alerts.js';
import { claimOnce, listSubscriptions } from './store.js';
import { sendPush } from './push.js';
import { fetchTodayRates, fetchTomorrowRates } from './octopus.js';

function sub(
  id: string,
  prefs: Partial<StoredSubscription['prefs']> = {}
): StoredSubscription {
  return {
    id,
    subscription: {
      endpoint: `https://push.example/${id}`,
      keys: { p256dh: 'p', auth: 'a' },
    },
    prefs: {
      region: 'C',
      ratesPublished: true,
      plunge: true,
      cheapWindow: false,
      cheapWindowHours: 2,
      ...prefs,
    },
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

/** 48 half-hour slots for the given UTC day, priced by `price(i)`. */
function day(dateIso: string, price: (i: number) => number): OctopusRate[] {
  const start = Date.parse(`${dateIso}T00:00:00Z`);
  return Array.from({ length: 48 }, (_, i) => ({
    value_exc_vat: price(i) / 1.05,
    value_inc_vat: price(i),
    valid_from: new Date(start + i * 30 * 60_000).toISOString(),
    valid_to: new Date(start + (i + 1) * 30 * 60_000).toISOString(),
    payment_method: null,
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sendPush).mockResolvedValue(true);
  vi.mocked(claimOnce).mockResolvedValue(true);
});

describe('runRatesPublishedAlerts', () => {
  it('sends the daily summary once tomorrow is fully published', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([sub('a'), sub('b')]);
    vi.mocked(fetchTomorrowRates).mockResolvedValue(
      day('2026-09-20', () => 20)
    );

    const result = await runRatesPublishedAlerts();

    expect(result.notificationsSent).toBe(2);
    expect(result.subscribers).toBe(2);
    expect(vi.mocked(sendPush).mock.calls[0][1].title).toContain(
      "Tomorrow's rates"
    );
  });

  it('does nothing, and says why, before the rates are published', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([sub('a')]);
    vi.mocked(fetchTomorrowRates).mockResolvedValue(
      day('2026-09-20', () => 20).slice(0, 4)
    );

    const result = await runRatesPublishedAlerts();

    expect(result.notificationsSent).toBe(0);
    expect(sendPush).not.toHaveBeenCalled();
    expect(claimOnce).not.toHaveBeenCalled(); // so a later run can still send
    expect(result.notes.join(' ')).toMatch(/not published yet/);
  });

  it('does not repeat itself once the day has been claimed', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([sub('a')]);
    vi.mocked(fetchTomorrowRates).mockResolvedValue(
      day('2026-09-20', () => 20)
    );
    vi.mocked(claimOnce).mockResolvedValue(false);

    const result = await runRatesPublishedAlerts();

    expect(result.notificationsSent).toBe(0);
    expect(result.notes.join(' ')).toMatch(/already sent/);
  });

  it('sends a plunge alert only to subscribers who want it', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([
      sub('a', { ratesPublished: false, plunge: true }),
      sub('b', { ratesPublished: true, plunge: false }),
    ]);
    vi.mocked(fetchTomorrowRates).mockResolvedValue(
      day('2026-09-20', (i) => (i === 10 ? -4 : 20))
    );

    await runRatesPublishedAlerts();

    const titles = vi
      .mocked(sendPush)
      .mock.calls.map(([s, p]) => [s.id, p.title]);
    expect(titles).toEqual([
      ['b', "Tomorrow's rates ⚡"],
      ['a', 'Plunge tomorrow ⚡'],
    ]);
  });

  it('reports when nobody has these alerts enabled', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([
      sub('a', { ratesPublished: false, plunge: false, cheapWindow: true }),
    ]);

    const result = await runRatesPublishedAlerts();

    expect(result.subscribers).toBe(0);
    expect(fetchTomorrowRates).not.toHaveBeenCalled();
    expect(result.notes[0]).toMatch(/No subscribers/);
  });
});

describe('runCheapWindowAlerts', () => {
  // Cheapest 2h (4-slot) run of the day starts 14:00 UTC.
  const rates = day('2026-09-19', (i) => (i >= 28 && i < 32 ? 1 : 20));

  it('alerts when the cheapest window starts within 30 minutes', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([
      sub('a', { cheapWindow: true }),
    ]);
    vi.mocked(fetchTodayRates).mockResolvedValue(rates);

    const result = await runCheapWindowAlerts(new Date('2026-09-19T13:45:00Z'));

    expect(result.notificationsSent).toBe(1);
    expect(vi.mocked(sendPush).mock.calls[0][1].body).toContain('in 15 min');
  });

  it('stays quiet while the window is still hours away', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([
      sub('a', { cheapWindow: true }),
    ]);
    vi.mocked(fetchTodayRates).mockResolvedValue(rates);

    const result = await runCheapWindowAlerts(new Date('2026-09-19T10:00:00Z'));

    expect(result.notificationsSent).toBe(0);
    expect(result.notes.join(' ')).toMatch(/1 not due/);
  });

  it('ignores subscribers who have not turned cheap-window alerts on', async () => {
    vi.mocked(listSubscriptions).mockResolvedValue([sub('a')]); // cheapWindow: false

    const result = await runCheapWindowAlerts(new Date('2026-09-19T13:45:00Z'));

    expect(result.subscribers).toBe(0);
    expect(sendPush).not.toHaveBeenCalled();
    expect(result.notes[0]).toMatch(/No subscribers/);
  });
});

describe('inRatesPublishWindow', () => {
  it('covers UK 15:00–21:00 in both summer and winter time', () => {
    // BST (UTC+1): 16:00 UK = 15:00Z
    expect(inRatesPublishWindow(new Date('2026-09-19T15:00:00Z'))).toBe(true);
    expect(inRatesPublishWindow(new Date('2026-09-19T13:30:00Z'))).toBe(false); // 14:30 UK
    expect(inRatesPublishWindow(new Date('2026-09-19T20:30:00Z'))).toBe(false); // 21:30 UK
    // GMT: 16:00 UK = 16:00Z
    expect(inRatesPublishWindow(new Date('2026-12-19T16:00:00Z'))).toBe(true);
    expect(inRatesPublishWindow(new Date('2026-12-19T21:30:00Z'))).toBe(false);
  });
});
