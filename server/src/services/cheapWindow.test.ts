import { describe, it, expect } from 'vitest';
import { findCheapestWindow } from './cheapWindow.js';
import type { OctopusRate } from '../schemas.js';

function makeRates(prices: number[]): OctopusRate[] {
  return prices.map((price, i) => {
    const from = new Date(Date.UTC(2026, 5, 12, 0, 30 * i));
    const to = new Date(from.getTime() + 30 * 60_000);
    return {
      value_exc_vat: price / 1.05,
      value_inc_vat: price,
      valid_from: from.toISOString(),
      valid_to: to.toISOString(),
      payment_method: null,
    };
  });
}

const beforeAll = new Date(Date.UTC(2026, 5, 11));

describe('findCheapestWindow (server)', () => {
  it('finds the cheapest contiguous run', () => {
    const win = findCheapestWindow(makeRates([10, 8, 2, 3, 9]), 2, beforeAll);
    expect(win!.avgPrice).toBe(2.5);
  });

  it('excludes fully passed slots', () => {
    const rates = makeRates([1, 1, 20, 25]);
    const now = new Date(rates[1].valid_to);
    const win = findCheapestWindow(rates, 2, now);
    expect(win!.avgPrice).toBe(22.5);
  });

  it('returns null when not enough slots remain', () => {
    expect(findCheapestWindow(makeRates([5]), 2, beforeAll)).toBeNull();
  });
});
