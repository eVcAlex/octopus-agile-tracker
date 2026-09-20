import { PRICE_THRESHOLDS, PRICE_COLORS, MANTINE_COLORS } from './constants';
import type { ProcessedSlot } from './schemas';

export type PriceLevel = 'free' | 'low' | 'normal' | 'high';

export function getPriceLevel(price: number): PriceLevel {
  if (price <= PRICE_THRESHOLDS.FREE) return 'free';
  if (price < PRICE_THRESHOLDS.LOW) return 'low';
  if (price > PRICE_THRESHOLDS.HIGH) return 'high';
  return 'normal';
}

export function getPriceColor(price: number, isCurrentPeriod = false): string {
  if (isCurrentPeriod) return PRICE_COLORS.current;
  return PRICE_COLORS[getPriceLevel(price)];
}

export function getMantinePriceColor(price: number): string | undefined {
  return MANTINE_COLORS[getPriceLevel(price)];
}

export function getStatusBadge(
  price: number
): { label: string; color: string } | null {
  const level = getPriceLevel(price);
  if (level === 'free') return { label: 'FREE', color: 'teal' };
  if (level === 'low') return { label: 'LOW', color: 'green' };
  if (level === 'high') return { label: 'HIGH', color: 'red' };
  return null;
}

export function formatPrice(price: number): string {
  return `${price.toFixed(2)}p`;
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${(hours * 60) | 0}m`;
  const h = Math.floor(hours);
  const m = (hours % 1) * 60;
  return m > 0 ? `${h}h ${m | 0}m` : `${h}h`;
}

export function isPast(item: ProcessedSlot): boolean {
  // validTo may be a string after cache rehydration, so normalise to a Date.
  return !item.isCurrentPeriod && new Date(item.validTo) < new Date();
}

export interface SlotStatus {
  current: ProcessedSlot;
  /** Earliest upcoming slot cheaper than the current one, if any. */
  nextCheaper: ProcessedSlot | null;
}

/** The live slot plus the next cheaper slot ahead of it (null if none live). */
export function getSlotStatus(slots: ProcessedSlot[]): SlotStatus | null {
  const current = slots.find((s) => s.isCurrentPeriod);
  if (!current) return null;
  const nextCheaper =
    slots.find(
      (s) =>
        s.validFrom > current.validFrom && s.priceIncVat < current.priceIncVat
    ) ?? null;
  return { current, nextCheaper };
}
