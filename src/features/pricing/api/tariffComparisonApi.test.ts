import { describe, it, expect } from 'vitest';
import { costAgainstSpans } from './tariffComparisonApi';
import type { ConsumptionEntry } from './consumptionApi';

function entry(start: string, kwh: number): ConsumptionEntry {
  const s = new Date(start);
  return {
    consumption: kwh,
    interval_start: s.toISOString(),
    interval_end: new Date(s.getTime() + 30 * 60_000).toISOString(),
  };
}

const span = (from: string, to: string | null, rate: number) => ({
  valid_from: from,
  valid_to: to,
  value_inc_vat: rate,
});

describe('costAgainstSpans', () => {
  it('prices slots against the covering span (daily Tracker-style rates)', () => {
    const result = costAgainstSpans(
      [
        entry('2026-07-01T10:00:00Z', 1),
        entry('2026-07-01T18:00:00Z', 2),
        entry('2026-07-02T10:00:00Z', 1),
      ],
      [
        span('2026-07-01T00:00:00Z', '2026-07-02T00:00:00Z', 10),
        span('2026-07-02T00:00:00Z', '2026-07-03T00:00:00Z', 20),
      ]
    );
    // 3 kWh * 10p + 1 kWh * 20p
    expect(result.unitCost).toBe(50);
    expect(result.coveredKwh).toBe(4);
    expect(result.totalKwh).toBe(4);
  });

  it('handles an open-ended current span (Flexible-style)', () => {
    const result = costAgainstSpans(
      [entry('2026-07-01T10:00:00Z', 2)],
      [span('2026-06-01T00:00:00Z', null, 25)]
    );
    expect(result.unitCost).toBe(50);
    expect(result.coveredKwh).toBe(2);
  });

  it('falls back to the recent daily pattern for uncovered slots (Go-style)', () => {
    // Go bands exist only for a recent day; earlier usage is priced by
    // time-of-day from that pattern, including the midnight-wrapping band.
    const spans = [
      span('2026-07-02T23:30:00Z', '2026-07-03T04:30:00Z', 5), // cheap night
      span('2026-07-03T04:30:00Z', '2026-07-03T23:30:00Z', 30), // day
    ];
    const result = costAgainstSpans(
      [
        entry('2026-06-20T02:00:00Z', 1), // night band via wrap
        entry('2026-06-20T12:00:00Z', 1), // day band
      ],
      spans
    );
    expect(result.unitCost).toBe(35);
    expect(result.coveredKwh).toBe(2);
  });

  it('reports uncovered kWh when nothing matches', () => {
    const result = costAgainstSpans([entry('2026-07-01T10:00:00Z', 3)], []);
    expect(result.unitCost).toBe(0);
    expect(result.coveredKwh).toBe(0);
    expect(result.totalKwh).toBe(3);
  });
});
