import { describe, it, expect } from 'vitest';
import {
  isPeak,
  wholesaleToAgile,
  estimateSlots,
  REGION_COEFFICIENTS,
} from './agileFormula';
import type { WholesaleSlot } from './schemas';

describe('isPeak', () => {
  it('is true inside 16:00–19:00 and false outside', () => {
    expect(isPeak(new Date('2026-07-02T17:00:00'))).toBe(true);
    expect(isPeak(new Date('2026-07-02T16:00:00'))).toBe(true);
    expect(isPeak(new Date('2026-07-02T19:00:00'))).toBe(false);
    expect(isPeak(new Date('2026-07-02T09:00:00'))).toBe(false);
  });
});

describe('wholesaleToAgile', () => {
  it('applies the region multiplier off-peak', () => {
    const { multiplier } = REGION_COEFFICIENTS.C;
    const price = wholesaleToAgile(10, new Date('2026-07-02T09:00:00'), 'C');
    expect(price).toBeCloseTo(multiplier * 10, 5);
  });

  it('adds the peak uplift inside the peak window', () => {
    const { multiplier, peakUplift } = REGION_COEFFICIENTS.C;
    const price = wholesaleToAgile(10, new Date('2026-07-02T17:30:00'), 'C');
    expect(price).toBeCloseTo(multiplier * 10 + peakUplift, 5);
  });

  it('caps at 100p/kWh inc VAT', () => {
    const price = wholesaleToAgile(9999, new Date('2026-07-02T17:30:00'), 'C');
    expect(price).toBe(100);
  });
});

describe('estimateSlots', () => {
  it('maps wholesale slots to ProcessedSlot with 30-min windows and VAT split', () => {
    const wholesale: WholesaleSlot[] = [
      { startTime: new Date('2026-07-02T00:00:00'), priceGbpMwh: 100 }, // 10 p/kWh
    ];
    const [slot] = estimateSlots(wholesale, 'C');
    expect(slot.dayType).toBe('tomorrow');
    expect(slot.isCurrentPeriod).toBe(false);
    expect(slot.validTo.getTime() - slot.validFrom.getTime()).toBe(30 * 60_000);
    expect(slot.priceExcVat).toBeCloseTo(slot.priceIncVat / 1.05, 5);
  });
});
