import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { groupByDay } from './forecastApi';
import type { ForecastPrice } from '../schemas';

function price(dateTime: string, pred = 15): ForecastPrice {
  return {
    date_time: dateTime,
    agile_pred: pred,
    agile_low: pred - 3,
    agile_high: pred + 3,
  };
}

describe('groupByDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups prices by calendar date', () => {
    const days = groupByDay([
      price('2026-06-13T00:00:00'),
      price('2026-06-13T00:30:00'),
      price('2026-06-14T00:00:00'),
    ]);

    expect(days).toHaveLength(2);
    expect(days[0].slots).toHaveLength(2);
    expect(days[1].slots).toHaveLength(1);
  });

  it('excludes today and the past', () => {
    const days = groupByDay([
      price('2026-06-11T12:00:00'),
      price('2026-06-12T12:00:00'),
      price('2026-06-13T12:00:00'),
    ]);

    expect(days.map((d) => d.date)).toEqual(['2026-06-13']);
  });

  it('labels the next day Tomorrow and later days with a date', () => {
    const days = groupByDay([
      price('2026-06-13T12:00:00'),
      price('2026-06-14T12:00:00'),
    ]);

    expect(days[0].label).toBe('Tomorrow');
    expect(days[1].label).toMatch(/14 Jun/);
  });

  it('sorts days ascending regardless of input order', () => {
    const days = groupByDay([
      price('2026-06-15T12:00:00'),
      price('2026-06-13T12:00:00'),
      price('2026-06-14T12:00:00'),
    ]);

    expect(days.map((d) => d.date)).toEqual([
      '2026-06-13',
      '2026-06-14',
      '2026-06-15',
    ]);
  });
});
