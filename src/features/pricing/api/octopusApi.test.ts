import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processRates, calcStats, aggregateDailyAverages } from './octopusApi';
import type { OctopusRate, ProcessedSlot } from '../schemas';

function rate(
  validFrom: string,
  validTo: string,
  priceIncVat: number
): OctopusRate {
  return {
    value_exc_vat: priceIncVat / 1.05,
    value_inc_vat: priceIncVat,
    valid_from: validFrom,
    valid_to: validTo,
    payment_method: null,
  };
}

function slot(priceIncVat: number, isCurrentPeriod = false): ProcessedSlot {
  return {
    id: String(priceIncVat),
    time: '00:00',
    date: '2026-06-12',
    priceExcVat: priceIncVat / 1.05,
    priceIncVat,
    validFrom: new Date(),
    validTo: new Date(),
    isCurrentPeriod,
    dayType: 'today',
  };
}

describe('processRates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 10:15 UTC on a summer day (11:15 BST in the UK)
    vi.setSystemTime(new Date('2026-06-12T10:15:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps API rates to processed slots', () => {
    const [processed] = processRates(
      [rate('2026-06-12T10:00:00Z', '2026-06-12T10:30:00Z', 14.2)],
      'today'
    );

    expect(processed.priceIncVat).toBe(14.2);
    expect(processed.validFrom).toEqual(new Date('2026-06-12T10:00:00Z'));
    expect(processed.validTo).toEqual(new Date('2026-06-12T10:30:00Z'));
    expect(processed.dayType).toBe('today');
  });

  it('marks only the slot containing now as the current period', () => {
    const processed = processRates(
      [
        rate('2026-06-12T09:30:00Z', '2026-06-12T10:00:00Z', 10),
        rate('2026-06-12T10:00:00Z', '2026-06-12T10:30:00Z', 12),
        rate('2026-06-12T10:30:00Z', '2026-06-12T11:00:00Z', 14),
      ],
      'today'
    );

    expect(processed.map((p) => p.isCurrentPeriod)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('never marks tomorrow slots as current', () => {
    const processed = processRates(
      [rate('2026-06-12T10:00:00Z', '2026-06-12T10:30:00Z', 12)],
      'tomorrow'
    );

    expect(processed[0].isCurrentPeriod).toBe(false);
  });

  it('handles a DST-length day without losing slots', () => {
    // BST -> GMT switch (2026-10-25): 50 half-hour slots in the civil day
    const slots: OctopusRate[] = [];
    const start = new Date('2026-10-24T23:00:00Z').getTime();
    for (let i = 0; i < 50; i++) {
      slots.push(
        rate(
          new Date(start + i * 1.8e6).toISOString(),
          new Date(start + (i + 1) * 1.8e6).toISOString(),
          10
        )
      );
    }

    expect(processRates(slots, 'today')).toHaveLength(50);
  });
});

describe('calcStats', () => {
  it('computes min, max and average', () => {
    const stats = calcStats([slot(10), slot(20), slot(30)]);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(30);
    expect(stats.average).toBe(20);
  });

  it('handles negative (plunge) prices', () => {
    const stats = calcStats([slot(-5), slot(5)]);
    expect(stats.min).toBe(-5);
    expect(stats.average).toBe(0);
  });

  it('returns the current period price when one is marked', () => {
    const stats = calcStats([slot(10), slot(22, true)]);
    expect(stats.current).toBe(22);
  });

  it('returns undefined current when no slot is live', () => {
    expect(calcStats([slot(10)]).current).toBeUndefined();
  });

  it('returns zeros for an empty day', () => {
    expect(calcStats([])).toEqual({
      min: 0,
      max: 0,
      average: 0,
      current: undefined,
    });
  });

  it('ignores NaN prices', () => {
    const stats = calcStats([slot(10), slot(NaN)]);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(10);
    expect(stats.average).toBe(10);
  });
});

describe('aggregateDailyAverages', () => {
  it('groups rates by day with min/max/average, sorted ascending', () => {
    const days = aggregateDailyAverages([
      rate('2026-06-11T10:00:00Z', '2026-06-11T10:30:00Z', 20),
      rate('2026-06-10T10:00:00Z', '2026-06-10T10:30:00Z', 10),
      rate('2026-06-10T10:30:00Z', '2026-06-10T11:00:00Z', 30),
    ]);

    expect(days.map((d) => d.date)).toEqual(['2026-06-10', '2026-06-11']);
    expect(days[0]).toMatchObject({ min: 10, max: 30, average: 20 });
    expect(days[1]).toMatchObject({ min: 20, max: 20, average: 20 });
  });

  it('returns empty for no rates', () => {
    expect(aggregateDailyAverages([])).toEqual([]);
  });
});
