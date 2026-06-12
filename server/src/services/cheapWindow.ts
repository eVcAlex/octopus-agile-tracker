import type { OctopusRate } from '../schemas.js';

export interface RateWindow {
  start: Date;
  end: Date;
  avgPrice: number;
}

/**
 * Cheapest contiguous run of `slotCount` half-hour slots that has not fully
 * passed. Mirrors the frontend cheap-windows util but operates on raw rates.
 */
export function findCheapestWindow(
  rates: OctopusRate[],
  slotCount: number,
  now: Date = new Date()
): RateWindow | null {
  const usable = rates.filter((r) => new Date(r.valid_to) > now);
  if (usable.length < slotCount) return null;

  let best: { startIdx: number; avg: number } | null = null;

  for (let i = 0; i + slotCount <= usable.length; i++) {
    let contiguous = true;
    let sum = usable[i].value_inc_vat;
    for (let j = 1; j < slotCount; j++) {
      if (usable[i + j].valid_from !== usable[i + j - 1].valid_to) {
        contiguous = false;
        break;
      }
      sum += usable[i + j].value_inc_vat;
    }
    if (!contiguous) continue;
    const avg = sum / slotCount;
    if (best === null || avg < best.avg) best = { startIdx: i, avg };
  }

  if (best === null) return null;

  return {
    start: new Date(usable[best.startIdx].valid_from),
    end: new Date(usable[best.startIdx + slotCount - 1].valid_to),
    avgPrice: best.avg,
  };
}
