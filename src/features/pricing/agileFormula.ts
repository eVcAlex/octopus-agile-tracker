import dayjs from 'dayjs';
import type { Region, ProcessedSlot, WholesaleSlot } from './schemas';

interface Coeff {
  multiplier: number;
  peakUplift: number; // p/kWh inc VAT, added 16:00–19:00 local
}

// Inc-VAT p/kWh coefficients for AGILE-24-10-01: agile = D*wholesale + P(peak).
// Seed values — the per-region table is calibrated against real data in Task 3.
const SEED: Coeff = { multiplier: 0.94, peakUplift: 12 };

export const REGION_COEFFICIENTS: Record<Region, Coeff> = {
  A: { ...SEED },
  B: { ...SEED },
  C: { ...SEED },
  D: { ...SEED },
  E: { ...SEED },
  F: { ...SEED },
  G: { ...SEED },
  H: { ...SEED },
  J: { ...SEED },
  K: { ...SEED },
  L: { ...SEED },
  M: { ...SEED },
  N: { ...SEED },
  P: { ...SEED },
};

const PEAK_START_HOUR = 16;
const PEAK_END_HOUR = 19;
const CAP_INC_VAT = 100;

export function isPeak(at: Date): boolean {
  const h = at.getHours();
  return h >= PEAK_START_HOUR && h < PEAK_END_HOUR;
}

export function wholesaleToAgile(
  pPerKwh: number,
  at: Date,
  region: Region
): number {
  const { multiplier, peakUplift } = REGION_COEFFICIENTS[region];
  const raw = multiplier * pPerKwh + (isPeak(at) ? peakUplift : 0);
  return Math.min(raw, CAP_INC_VAT);
}

export function estimateSlots(
  wholesale: WholesaleSlot[],
  region: Region
): ProcessedSlot[] {
  return wholesale.map((w, i) => {
    const from = w.startTime;
    const to = new Date(from.getTime() + 30 * 60_000);
    const incVat = wholesaleToAgile(w.priceGbpMwh / 10, from, region);
    return {
      id: `est-${from.toISOString()}-${i}`,
      time: dayjs(from).format('HH:mm'),
      date: dayjs(from).format('YYYY-MM-DD'),
      priceExcVat: incVat / 1.05,
      priceIncVat: incVat,
      validFrom: from,
      validTo: to,
      isCurrentPeriod: false,
      dayType: 'tomorrow',
    };
  });
}
