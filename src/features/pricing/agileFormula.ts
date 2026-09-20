import dayjs from 'dayjs';
import type { Region, ProcessedSlot, WholesaleSlot } from './schemas';

interface Coeff {
  base: number; // p/kWh inc VAT, fixed regional offset
  multiplier: number; // applied to the day-ahead price in p/kWh
  peakUplift: number; // p/kWh inc VAT, added 16:00–19:00 Europe/London
}

// Inc-VAT model for AGILE-24-10-01:
//   agile = base + multiplier * wholesale_pPerKwh + (peak ? peakUplift : 0)
// Coefficients are a least-squares fit of the confirmed Octopus rates against
// the N2EX day-ahead hourly auction, pooled over several settled days
// (see scripts/calibrate-agile.ts). This reproduces Agile to a few p/kWh on a
// typical day. It is a labelled estimate, not the confirmed rate.
export const REGION_COEFFICIENTS: Record<Region, Coeff> = {
  A: { base: -2.889, multiplier: 2.1235, peakUplift: 13.804 },
  B: { base: -2.92, multiplier: 2.0225, peakUplift: 14.847 },
  C: { base: -2.92, multiplier: 2.0225, peakUplift: 12.747 },
  D: { base: -2.86, multiplier: 2.2247, peakUplift: 13.811 },
  E: { base: -2.889, multiplier: 2.1235, peakUplift: 12.754 },
  F: { base: -2.889, multiplier: 2.1235, peakUplift: 12.754 },
  G: { base: -2.889, multiplier: 2.1235, peakUplift: 12.754 },
  H: { base: -2.889, multiplier: 2.1235, peakUplift: 12.754 },
  J: { base: -2.86, multiplier: 2.2247, peakUplift: 12.761 },
  K: { base: -2.86, multiplier: 2.2247, peakUplift: 12.761 },
  L: { base: -2.831, multiplier: 2.3258, peakUplift: 11.719 },
  M: { base: -2.92, multiplier: 2.0225, peakUplift: 13.797 },
  N: { base: -2.889, multiplier: 2.1235, peakUplift: 13.804 },
  P: { base: -2.801, multiplier: 2.4269, peakUplift: 12.776 },
};

const PEAK_START_HOUR = 16;
const PEAK_END_HOUR = 19;
const CAP_INC_VAT = 100;

/** Hour of `at` in Europe/London (handles GMT/BST regardless of runtime TZ). */
function londonHour(at: Date): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    hour12: false,
  }).format(at);
  return h === '24' ? 0 : Number(h);
}

export function isPeak(at: Date): boolean {
  const h = londonHour(at);
  return h >= PEAK_START_HOUR && h < PEAK_END_HOUR;
}

export function wholesaleToAgile(
  pPerKwh: number,
  at: Date,
  region: Region
): number {
  const { base, multiplier, peakUplift } = REGION_COEFFICIENTS[region];
  const raw = base + multiplier * pPerKwh + (isPeak(at) ? peakUplift : 0);
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

export interface EstimateAccuracy {
  meanAbsError: number; // p/kWh
  maxAbsError: number; // p/kWh
  n: number; // matched half-hours
}

/**
 * How close an estimate came to Octopus's confirmed rates, matched on slot
 * start time. Estimated slots without a confirmed counterpart are skipped.
 */
export function compareEstimateToConfirmed(
  estimated: ProcessedSlot[],
  confirmed: { valid_from: string; value_inc_vat: number }[]
): EstimateAccuracy {
  const confirmedByStart = new Map<number, number>();
  for (const r of confirmed) {
    confirmedByStart.set(new Date(r.valid_from).getTime(), r.value_inc_vat);
  }

  let sum = 0;
  let max = 0;
  let n = 0;
  for (const s of estimated) {
    const actual = confirmedByStart.get(new Date(s.validFrom).getTime());
    if (actual === undefined) continue;
    const err = Math.abs(s.priceIncVat - actual);
    sum += err;
    max = Math.max(max, err);
    n++;
  }

  return { meanAbsError: n ? sum / n : 0, maxAbsError: max, n };
}
