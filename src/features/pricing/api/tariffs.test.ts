import { describe, it, expect } from 'vitest';
import {
  completeNextDay,
  expandToSlots,
  hasIntradayVariation,
  isAgileProduct,
  parseTariffCode,
  projectNextDay,
  tariffKey,
  tariffName,
} from './tariffs';
import type { OctopusRateWindow } from '../schemas';

function win(
  from: string,
  to: string | null,
  inc: number,
  paymentMethod?: string | null
): OctopusRateWindow {
  return {
    valid_from: from,
    valid_to: to,
    value_inc_vat: inc,
    value_exc_vat: inc / 1.05,
    payment_method: paymentMethod,
  };
}

const D = (s: string) => new Date(s);

describe('expandToSlots', () => {
  it('passes half-hourly (Agile) windows through unchanged', () => {
    const slots = expandToSlots(
      [
        win('2026-09-19T00:00:00Z', '2026-09-19T00:30:00Z', 10),
        win('2026-09-19T00:30:00Z', '2026-09-19T01:00:00Z', 12),
      ],
      D('2026-09-19T00:00:00Z'),
      D('2026-09-19T01:00:00Z')
    );
    expect(slots.map((s) => s.value_inc_vat)).toEqual([10, 12]);
    expect(slots[0].valid_from).toBe('2026-09-19T00:00:00Z');
    expect(slots[0].valid_to).toBe('2026-09-19T00:30:00Z');
  });

  it('expands multi-hour bands (Go) into half-hour slots', () => {
    const slots = expandToSlots(
      [
        win('2026-09-18T23:30:00Z', '2026-09-19T04:30:00Z', 8.6),
        win('2026-09-19T04:30:00Z', '2026-09-19T23:30:00Z', 31),
        win('2026-09-19T23:30:00Z', '2026-09-20T04:30:00Z', 8.6),
      ],
      D('2026-09-19T00:00:00Z'),
      D('2026-09-20T00:00:00Z')
    );
    expect(slots).toHaveLength(48);
    expect(slots[0].value_inc_vat).toBe(8.6); // 00:00 – in the night band
    expect(slots[8].value_inc_vat).toBe(8.6); // 04:00
    expect(slots[9].value_inc_vat).toBe(31); // 04:30 – band boundary
    expect(slots[47].value_inc_vat).toBe(8.6); // 23:30 – next night band
  });

  it('clips a window to the requested range', () => {
    const slots = expandToSlots(
      [win('2026-09-17T23:00:00Z', '2026-09-19T23:00:00Z', 13)],
      D('2026-09-19T00:00:00Z'),
      D('2026-09-19T02:00:00Z')
    );
    expect(slots).toHaveLength(4);
    expect(slots[0].valid_from).toBe('2026-09-19T00:00:00Z');
    expect(slots[3].valid_to).toBe('2026-09-19T02:00:00Z');
  });

  it('fills an open-ended (fixed) window up to the range end', () => {
    const slots = expandToSlots(
      [win('2026-09-10T23:00:00Z', null, 28)],
      D('2026-09-19T00:00:00Z'),
      D('2026-09-20T00:00:00Z')
    );
    expect(slots).toHaveLength(48);
    expect(new Set(slots.map((s) => s.value_inc_vat))).toEqual(new Set([28]));
  });

  it('keeps only Direct Debit rows when Octopus lists both (Flexible)', () => {
    const slots = expandToSlots(
      [
        win('2026-06-30T23:00:00Z', '2026-09-30T23:00:00Z', 26.3, 'DIRECT_DEBIT'),
        win('2026-06-30T23:00:00Z', '2026-09-30T23:00:00Z', 27.8, 'NON_DIRECT_DEBIT'),
      ],
      D('2026-09-19T00:00:00Z'),
      D('2026-09-19T01:00:00Z')
    );
    expect(slots).toHaveLength(2);
    expect(slots.every((s) => s.value_inc_vat === 26.3)).toBe(true);
  });

  it('returns slots sorted ascending regardless of input order', () => {
    const slots = expandToSlots(
      [
        win('2026-09-19T01:00:00Z', '2026-09-19T01:30:00Z', 2),
        win('2026-09-19T00:00:00Z', '2026-09-19T00:30:00Z', 1),
      ],
      D('2026-09-19T00:00:00Z'),
      D('2026-09-19T02:00:00Z')
    );
    expect(slots.map((s) => s.value_inc_vat)).toEqual([1, 2]);
  });

  it('returns nothing when no window overlaps the range', () => {
    expect(
      expandToSlots(
        [win('2026-09-10T00:00:00Z', '2026-09-11T00:00:00Z', 5)],
        D('2026-09-19T00:00:00Z'),
        D('2026-09-20T00:00:00Z')
      )
    ).toEqual([]);
  });
});

describe('projectNextDay', () => {
  it('shifts every slot forward one day, keeping prices', () => {
    const projected = projectNextDay([
      {
        valid_from: '2026-09-19T00:00:00Z',
        valid_to: '2026-09-19T00:30:00Z',
        value_inc_vat: 9,
        value_exc_vat: 8.5,
        payment_method: null,
      },
    ]);
    expect(projected[0].value_inc_vat).toBe(9);
    expect(new Date(projected[0].valid_from).toISOString()).toBe(
      '2026-09-20T00:00:00.000Z'
    );
  });
});

describe('completeNextDay', () => {
  const slot = (from: string, to: string, inc: number) => ({
    valid_from: from,
    valid_to: to,
    value_inc_vat: inc,
    value_exc_vat: inc / 1.05,
    payment_method: null,
  });
  const today = [
    slot('2026-09-19T00:00:00Z', '2026-09-19T00:30:00Z', 8),
    slot('2026-09-19T00:30:00Z', '2026-09-19T01:00:00Z', 30),
  ];
  const dayStart = D('2026-09-20T00:00:00Z');
  const dayEnd = D('2026-09-20T01:00:00Z');

  it('fills slots Octopus has not listed yet and flags the day projected', () => {
    // Only the first slot is published (the "sliver" case).
    const { rates, projected } = completeNextDay(
      [slot('2026-09-20T00:00:00Z', '2026-09-20T00:30:00Z', 9)],
      today,
      dayStart,
      dayEnd
    );
    expect(projected).toBe(true);
    // Published slot wins over the projected 8p; the gap is filled with 30p.
    expect(rates.map((r) => r.value_inc_vat)).toEqual([9, 30]);
  });

  it('is not flagged projected when the whole day is published', () => {
    const { projected } = completeNextDay(
      [
        slot('2026-09-20T00:00:00Z', '2026-09-20T00:30:00Z', 9),
        slot('2026-09-20T00:30:00Z', '2026-09-20T01:00:00Z', 31),
      ],
      today,
      dayStart,
      dayEnd
    );
    expect(projected).toBe(false);
  });

  it('projects the whole day when nothing is published', () => {
    const { rates, projected } = completeNextDay([], today, dayStart, dayEnd);
    expect(projected).toBe(true);
    expect(rates.map((r) => r.value_inc_vat)).toEqual([8, 30]);
  });
});

describe('hasIntradayVariation', () => {
  it('is false for flat and empty days', () => {
    expect(hasIntradayVariation([])).toBe(false);
    expect(hasIntradayVariation([28, 28, 28])).toBe(false);
  });
  it('is true when the price moves', () => {
    expect(hasIntradayVariation([8.6, 31])).toBe(true);
  });
});

describe('tariff identity', () => {
  it('detects Agile products', () => {
    expect(isAgileProduct('AGILE-24-10-01')).toBe(true);
    expect(isAgileProduct('AGILE-FLEX-22-11-25')).toBe(true);
    expect(isAgileProduct('GO-VAR-22-10-14')).toBe(false);
  });

  it('parses tariff codes', () => {
    expect(parseTariffCode('E-1R-AGILE-24-10-01-C')).toEqual({
      fuel: 'E',
      registers: 1,
      product: 'AGILE-24-10-01',
      region: 'C',
    });
    expect(parseTariffCode('G-1R-SILVER-24-07-01-A')?.product).toBe(
      'SILVER-24-07-01'
    );
    expect(parseTariffCode('E-2R-VAR-22-11-01-C')?.registers).toBe(2);
    expect(parseTariffCode('nonsense')).toBeNull();
  });

  it('names and keys known tariff families, falling back to the code', () => {
    expect(tariffName('GO-VAR-22-10-14')).toBe('Go');
    expect(tariffName('IOG-SMB-FIX-12M-26-09-18')).toBe('Intelligent Go');
    expect(tariffName('SILVER-25-09-02')).toBe('Tracker');
    expect(tariffName('VAR-22-11-01')).toBe('Flexible');
    expect(tariffName('MYSTERY-1')).toBe('MYSTERY-1');
    expect(tariffKey('COSY-22-12-08')).toBe('cosy');
    expect(tariffKey('VAR-22-11-01')).toBe('flexible');
  });
});
