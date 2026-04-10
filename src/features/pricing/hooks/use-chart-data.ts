import { useMemo, useState } from 'react';
import type { ProcessedSlot } from '../schemas';
import { CHART } from '../constants';
import { getPriceColor, isPast } from '../utils';

export function useChartData(data: ProcessedSlot[]) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const computed = useMemo(() => {
    const prices = data.map((d) => d.priceIncVat);
    const maxPrice = Math.max(...prices, 0.1);
    const minPrice = Math.min(...prices, 0);
    const range = maxPrice - minPrice;
    const avg = prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;

    const priceToY = (p: number) =>
      Math.round(((maxPrice - p) / range) * CHART.HEIGHT);

    const gridPrices: number[] = [];
    if (minPrice < 0) gridPrices.push(0);
    for (let p = 0; p <= maxPrice + CHART.GRID_INTERVAL; p += CHART.GRID_INTERVAL) {
      if (p >= minPrice && p <= maxPrice + 1) gridPrices.push(p);
    }

    const timeLabels: { index: number; label: string }[] = [];
    data.forEach((slot, i) => {
      const [h, m] = slot.time.split(':').map(Number);
      if (m === 0 && h % CHART.TIME_LABEL_INTERVAL === 0) {
        timeLabels.push({ index: i, label: `${String(h).padStart(2, '0')}:00` });
      }
    });

    const currentIndex = data.findIndex((d) => d.isCurrentPeriod);

    const bars = data.map((slot, i) => {
      const height = Math.max(
        (Math.abs(slot.priceIncVat - Math.min(minPrice, 0)) / range) * CHART.HEIGHT,
        1,
      );
      return {
        height,
        color: getPriceColor(slot.priceIncVat, slot.isCurrentPeriod),
        past: isPast(slot),
        current: slot.isCurrentPeriod,
      };
    });

    return { maxPrice, minPrice, range, avg, priceToY, gridPrices, timeLabels, currentIndex, bars };
  }, [data]);

  return {
    ...computed,
    hoveredIndex,
    setHoveredIndex,
    hoveredSlot: hoveredIndex !== null ? data[hoveredIndex] : null,
  };
}
