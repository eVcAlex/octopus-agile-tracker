import { describe, it, expect } from 'vitest';
import { dailyGasRates, gasRateAt } from './gasApi';
import type { GasRate } from '../schemas';

function rate(
  validFrom: string,
  validTo: string | null,
  value: number
): GasRate {
  return {
    date: validFrom.slice(0, 10),
    unitRateIncVat: value,
    unitRateExcVat: value / 1.05,
    validFrom: new Date(validFrom),
    validTo: validTo ? new Date(validTo) : null,
    isCurrent: false,
  };
}

// Newest first, as fetchGasRates returns them.
const NOW = new Date('2026-06-12T15:00:00Z');

describe('gasRateAt', () => {
  it('finds the daily row covering the instant (Tracker-style)', () => {
    const rates = [
      rate('2026-06-13T00:00:00Z', '2026-06-14T00:00:00Z', 6.5),
      rate('2026-06-12T00:00:00Z', '2026-06-13T00:00:00Z', 6.2),
    ];
    expect(gasRateAt(rates, NOW)?.unitRateIncVat).toBe(6.2);
    expect(
      gasRateAt(rates, new Date('2026-06-13T12:00:00Z'))?.unitRateIncVat
    ).toBe(6.5);
  });

  it('returns null when no row covers the instant', () => {
    const rates = [rate('2026-06-12T00:00:00Z', '2026-06-13T00:00:00Z', 6.2)];
    expect(gasRateAt(rates, new Date('2026-06-14T12:00:00Z'))).toBeNull();
  });

  it('treats an open-ended row as covering the future (fixed/variable)', () => {
    const rates = [rate('2026-01-01T00:00:00Z', null, 5.9)];
    expect(
      gasRateAt(rates, new Date('2026-06-13T12:00:00Z'))?.unitRateIncVat
    ).toBe(5.9);
  });
});

describe('dailyGasRates', () => {
  it('expands a single open-ended rate into a full day-by-day series', () => {
    const daily = dailyGasRates(
      [rate('2026-01-01T00:00:00Z', null, 5.9)],
      30,
      NOW
    );
    expect(daily).toHaveLength(30);
    expect(new Set(daily.map((d) => d.unitRateIncVat))).toEqual(new Set([5.9]));
    expect(new Set(daily.map((d) => d.date)).size).toBe(30);
  });

  it('is newest-first and flags only today as current', () => {
    const daily = dailyGasRates(
      [rate('2026-01-01T00:00:00Z', null, 5.9)],
      5,
      NOW
    );
    expect(daily.map((d) => d.isCurrent)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(daily[0].date > daily[1].date).toBe(true);
  });

  it('reflects a mid-window price change', () => {
    const daily = dailyGasRates(
      [
        rate('2026-06-10T00:00:00Z', null, 7),
        rate('2026-01-01T00:00:00Z', '2026-06-10T00:00:00Z', 6),
      ],
      5,
      NOW
    );
    expect(daily.map((d) => d.unitRateIncVat)).toEqual([7, 7, 7, 6, 6]);
  });

  it('skips days before the tariff started', () => {
    const daily = dailyGasRates(
      [rate('2026-06-11T00:00:00Z', null, 6)],
      5,
      NOW
    );
    expect(daily).toHaveLength(2);
  });
});
