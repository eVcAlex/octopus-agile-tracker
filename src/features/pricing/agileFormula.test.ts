import { describe, it, expect } from 'vitest';
import {
  isPeak,
  wholesaleToAgile,
  estimateSlots,
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
