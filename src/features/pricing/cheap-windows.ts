import type { ProcessedSlot } from './schemas';

export interface CheapWindow {
  durationHours: number;
  start: Date;
  end: Date;
  startLabel: string;
  endLabel: string;
  avgPrice: number;
  /** True when now falls inside the window */
  isActive: boolean;
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Finds the cheapest contiguous run of `slotCount` half-hour slots that has
 * not fully passed. Slots must be consecutive (no gaps) to qualify.
 */
export function findCheapestWindow(
  slots: ProcessedSlot[],
  slotCount: number,
  now: Date = new Date()
): CheapWindow | null {
  const usable = slots.filter((s) => s.validTo > now);
  if (usable.length < slotCount) return null;

  let best: { startIdx: number; avg: number } | null = null;

  for (let i = 0; i + slotCount <= usable.length; i++) {
    let contiguous = true;
    let sum = usable[i].priceIncVat;
    for (let j = 1; j < slotCount; j++) {
      if (
        usable[i + j].validFrom.getTime() !==
        usable[i + j - 1].validTo.getTime()
      ) {
        contiguous = false;
        break;
      }
      sum += usable[i + j].priceIncVat;
    }
    if (!contiguous) continue;
    const avg = sum / slotCount;
    if (best === null || avg < best.avg) best = { startIdx: i, avg };
  }

  if (best === null) return null;

  const start = usable[best.startIdx].validFrom;
  const end = usable[best.startIdx + slotCount - 1].validTo;
  return {
    durationHours: slotCount / 2,
    start,
    end,
    startLabel: timeLabel(start),
    endLabel: timeLabel(end),
    avgPrice: best.avg,
    isActive: start <= now && now < end,
  };
}

export const WINDOW_DURATIONS_HOURS = [1, 2, 3, 4] as const;

export function findCheapestWindows(
  slots: ProcessedSlot[],
  now: Date = new Date()
): CheapWindow[] {
  return WINDOW_DURATIONS_HOURS.map((h) =>
    findCheapestWindow(slots, h * 2, now)
  ).filter((w): w is CheapWindow => w !== null);
}
