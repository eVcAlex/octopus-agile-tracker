import { describe, it, expect } from 'vitest';
import { findCheapestWindow, findCheapestWindows } from './cheap-windows';
import type { ProcessedSlot } from './schemas';

const DAY = '2026-06-12';

function makeSlots(prices: number[], startHour = 0): ProcessedSlot[] {
  return prices.map((price, i) => {
    const from = new Date(Date.UTC(2026, 5, 12, startHour, 0));
    from.setUTCMinutes(from.getUTCMinutes() + i * 30);
    const to = new Date(from.getTime() + 30 * 60_000);
    return {
      id: `${i}`,
      time: from.toISOString().slice(11, 16),
      date: DAY,
      priceExcVat: price / 1.05,
      priceIncVat: price,
      validFrom: from,
      validTo: to,
      isCurrentPeriod: false,
      dayType: 'today' as const,
    };
  });
}

const beforeAll = new Date(Date.UTC(2026, 5, 11, 0, 0));

describe('findCheapestWindow', () => {
  it('finds the cheapest contiguous run', () => {
    // cheapest 1h (2 slots) is indices 2-3: avg 2.5
    const slots = makeSlots([10, 8, 2, 3, 9, 10]);
    const win = findCheapestWindow(slots, 2, beforeAll);

    expect(win).not.toBeNull();
    expect(win!.avgPrice).toBe(2.5);
    expect(win!.start).toEqual(slots[2].validFrom);
    expect(win!.end).toEqual(slots[3].validTo);
  });

  it('ignores slots that have fully passed', () => {
    const slots = makeSlots([1, 1, 20, 30, 25, 22]);
    // now = after the two cheap slots have ended
    const now = slots[1].validTo;
    const win = findCheapestWindow(slots, 2, now);

    expect(win!.avgPrice).toBe(23.5); // 25 + 22 avg, the cheapest remaining pair
  });

  it('includes the in-progress slot', () => {
    const slots = makeSlots([1, 2, 30, 30]);
    // now = midway through slot 0
    const now = new Date(slots[0].validFrom.getTime() + 10 * 60_000);
    const win = findCheapestWindow(slots, 2, now);

    expect(win!.avgPrice).toBe(1.5);
    expect(win!.isActive).toBe(true);
  });

  it('returns null when not enough slots remain', () => {
    const slots = makeSlots([5, 5]);
    expect(findCheapestWindow(slots, 4, beforeAll)).toBeNull();
  });

  it('does not bridge gaps between non-contiguous slots', () => {
    const slots = makeSlots([1, 30, 30, 1]);
    // remove a slot to create a gap between cheap endpoints
    const gapped = [slots[0], slots[3]];
    expect(findCheapestWindow(gapped, 2, beforeAll)).toBeNull();
  });

  it('handles negative plunge prices', () => {
    const slots = makeSlots([5, -3, -4, 5]);
    const win = findCheapestWindow(slots, 2, beforeAll);
    expect(win!.avgPrice).toBe(-3.5);
  });
});

describe('findCheapestWindows', () => {
  it('returns one window per duration that fits', () => {
    const slots = makeSlots(Array.from({ length: 48 }, (_, i) => (i % 24) + 1));
    const wins = findCheapestWindows(slots, beforeAll);

    expect(wins.map((w) => w.durationHours)).toEqual([1, 2, 3, 4]);
  });

  it('omits durations longer than the remaining day', () => {
    const slots = makeSlots([5, 6, 7, 8]); // only 2h of data
    const wins = findCheapestWindows(slots, beforeAll);

    expect(wins.map((w) => w.durationHours)).toEqual([1, 2]);
  });
});
