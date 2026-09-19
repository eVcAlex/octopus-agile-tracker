import { describe, it, expect } from 'vitest';
import { calcSpend, type ConsumptionEntry } from './consumptionApi';
import type { OctopusRate } from '../schemas';

function entry(start: string, kwh: number): ConsumptionEntry {
  const s = new Date(start);
  const e = new Date(s.getTime() + 30 * 60_000);
  return {
    consumption: kwh,
    interval_start: s.toISOString(),
    interval_end: e.toISOString(),
  };
}

function rate(start: string, price: number): OctopusRate {
  const s = new Date(start);
  const e = new Date(s.getTime() + 30 * 60_000);
  return {
    value_exc_vat: price / 1.05,
    value_inc_vat: price,
    valid_from: s.toISOString(),
    valid_to: e.toISOString(),
    payment_method: null,
  };
}

describe('calcSpend', () => {
  it('joins consumption with rates and totals per day', () => {
    const summary = calcSpend(
      [
        entry('2026-06-10T10:00:00Z', 0.5),
        entry('2026-06-10T10:30:00Z', 1.0),
        entry('2026-06-11T10:00:00Z', 2.0),
      ],
      [
        rate('2026-06-10T10:00:00Z', 10),
        rate('2026-06-10T10:30:00Z', 20),
        rate('2026-06-11T10:00:00Z', 5),
      ],
      15
    );

    expect(summary.days).toHaveLength(2);
    // day 1: 0.5*10 + 1.0*20 = 25p; day 2: 2.0*5 = 10p
    expect(summary.days[0].cost).toBe(25);
    expect(summary.days[1].cost).toBe(10);
    expect(summary.totalCost).toBe(35);
    expect(summary.totalKwh).toBe(3.5);
    // flat: 3.5 kWh * 15p
    expect(summary.totalFlatCost).toBe(52.5);
  });

  it('skips consumption slots with no matching rate', () => {
    const summary = calcSpend(
      [entry('2026-06-10T10:00:00Z', 1), entry('2026-06-10T10:30:00Z', 1)],
      [rate('2026-06-10T10:00:00Z', 10)],
      15
    );

    expect(summary.totalKwh).toBe(1);
    expect(summary.totalCost).toBe(10);
  });

  it('handles empty input', () => {
    const summary = calcSpend([], [], 15);
    expect(summary.days).toEqual([]);
    expect(summary.totalCost).toBe(0);
  });
});
