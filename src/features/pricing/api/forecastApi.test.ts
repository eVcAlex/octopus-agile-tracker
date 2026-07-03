import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { groupByDay, tomorrowForecastAsDailyPrices } from './forecastApi';
import type { ForecastData, ForecastPrice } from '../schemas';

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

describe('tomorrowForecastAsDailyPrices', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const forecastFor = (dates: string[]): ForecastData => ({
    createdAt: '2026-06-12T06:00:00',
    region: 'C',
    days: groupByDay(dates.map((d) => price(d))),
  });

  it("maps tomorrow's forecast day into DailyPrices slots and stats", () => {
    const data = forecastFor([
      '2026-06-13T00:00:00',
      '2026-06-13T00:30:00',
      '2026-06-14T00:00:00',
    ]);
    const daily = tomorrowForecastAsDailyPrices(data);

    expect(daily).not.toBeNull();
    expect(daily!.date).toBe('2026-06-13');
    expect(daily!.rates).toHaveLength(2);
    const [slot] = daily!.rates;
    expect(slot.priceIncVat).toBe(15);
    expect(slot.priceExcVat).toBeCloseTo(15 / 1.05, 5);
    expect(slot.time).toBe('00:00');
    expect(slot.dayType).toBe('tomorrow');
    expect(slot.isCurrentPeriod).toBe(false);
    expect(slot.validTo.getTime() - slot.validFrom.getTime()).toBe(30 * 60_000);
    expect(daily!.stats.average).toBe(15);
  });

  it('returns null when the forecast has no day for tomorrow', () => {
    const data = forecastFor(['2026-06-14T12:00:00']);
    expect(tomorrowForecastAsDailyPrices(data)).toBeNull();
  });

  it('returns null for null forecast', () => {
    expect(tomorrowForecastAsDailyPrices(null)).toBeNull();
  });
});
