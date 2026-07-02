import { describe, it, expect } from 'vitest';
import {
  isPeak,
  wholesaleToAgile,
  estimateSlots,
  compareEstimateToConfirmed,
  REGION_COEFFICIENTS,
} from './agileFormula';
import type { WholesaleSlot } from './schemas';

describe('isPeak (Europe/London 16:00–19:00)', () => {
  it('is peak during the London evening window in BST', () => {
    // Summer (BST = UTC+1): 15:00Z = 16:00 London.
    expect(isPeak(new Date('2026-07-15T15:00:00Z'))).toBe(true);
    expect(isPeak(new Date('2026-07-15T17:59:00Z'))).toBe(true);
    expect(isPeak(new Date('2026-07-15T18:00:00Z'))).toBe(false); // 19:00 London
    expect(isPeak(new Date('2026-07-15T08:00:00Z'))).toBe(false); // 09:00 London
  });

  it('is peak during the London evening window in GMT', () => {
    // Winter (GMT = UTC+0): 16:00Z = 16:00 London.
    expect(isPeak(new Date('2026-01-15T16:00:00Z'))).toBe(true);
    expect(isPeak(new Date('2026-01-15T18:30:00Z'))).toBe(true);
    expect(isPeak(new Date('2026-01-15T19:00:00Z'))).toBe(false);
  });
});

describe('wholesaleToAgile', () => {
  const { base, multiplier, peakUplift } = REGION_COEFFICIENTS.C;

  it('applies base + multiplier off-peak', () => {
    const price = wholesaleToAgile(10, new Date('2026-07-15T09:00:00Z'), 'C');
    expect(price).toBeCloseTo(base + multiplier * 10, 5);
  });

  it('adds the peak uplift inside the London peak window', () => {
    const price = wholesaleToAgile(10, new Date('2026-07-15T16:00:00Z'), 'C');
    expect(price).toBeCloseTo(base + multiplier * 10 + peakUplift, 5);
  });

  it('caps at 100p/kWh inc VAT', () => {
    const price = wholesaleToAgile(9999, new Date('2026-07-15T16:00:00Z'), 'C');
    expect(price).toBe(100);
  });
});

describe('estimateSlots', () => {
  it('maps wholesale slots to ProcessedSlot with 30-min windows and VAT split', () => {
    const wholesale: WholesaleSlot[] = [
      { startTime: new Date('2026-07-16T00:00:00Z'), priceGbpMwh: 100 }, // 10 p/kWh
    ];
    const [slot] = estimateSlots(wholesale, 'C');
    expect(slot.dayType).toBe('tomorrow');
    expect(slot.isCurrentPeriod).toBe(false);
    expect(slot.validTo.getTime() - slot.validFrom.getTime()).toBe(30 * 60_000);
    expect(slot.priceExcVat).toBeCloseTo(slot.priceIncVat / 1.05, 5);
    // 01:00 London is off-peak: base + multiplier * 10
    const { base, multiplier } = REGION_COEFFICIENTS.C;
    expect(slot.priceIncVat).toBeCloseTo(base + multiplier * 10, 5);
  });
});

describe('compareEstimateToConfirmed', () => {
  const slot = (iso: string, priceIncVat: number) => ({
    id: iso,
    time: '00:00',
    date: '2026-07-01',
    priceExcVat: priceIncVat / 1.05,
    priceIncVat,
    validFrom: new Date(iso),
    validTo: new Date(new Date(iso).getTime() + 30 * 60_000),
    isCurrentPeriod: false,
    dayType: 'tomorrow' as const,
  });

  it('computes mean and max absolute error over matched slots', () => {
    const estimated = [
      slot('2026-07-01T00:00:00Z', 12),
      slot('2026-07-01T00:30:00Z', 20),
    ];
    const confirmed = [
      { valid_from: '2026-07-01T00:00:00Z', value_inc_vat: 10 }, // err 2
      { valid_from: '2026-07-01T00:30:00Z', value_inc_vat: 24 }, // err 4
    ];
    const acc = compareEstimateToConfirmed(estimated, confirmed);
    expect(acc.n).toBe(2);
    expect(acc.meanAbsError).toBeCloseTo(3, 5);
    expect(acc.maxAbsError).toBeCloseTo(4, 5);
  });

  it('skips estimated slots with no matching confirmed rate', () => {
    const estimated = [
      slot('2026-07-01T00:00:00Z', 12),
      slot('2026-07-01T05:00:00Z', 99),
    ];
    const confirmed = [
      { valid_from: '2026-07-01T00:00:00Z', value_inc_vat: 11 },
    ];
    const acc = compareEstimateToConfirmed(estimated, confirmed);
    expect(acc.n).toBe(1);
    expect(acc.meanAbsError).toBeCloseTo(1, 5);
  });

  it('returns zeros for no overlap', () => {
    const acc = compareEstimateToConfirmed([], []);
    expect(acc).toEqual({ meanAbsError: 0, maxAbsError: 0, n: 0 });
  });
});
