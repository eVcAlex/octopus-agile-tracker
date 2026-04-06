import { useState } from 'react';
import { Box, Text, Group } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';
import { getPriceColor, getMantinePriceColor, isPast, formatPrice } from '../../utils';
import { CHART, CHART_LEGEND } from '../../constants';
import styles from './Chart.module.scss';

interface PriceChartProps {
  data: ProcessedPriceData[];
}

export const PriceChart = ({ data }: PriceChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) return null;

  const prices = data.map((d) => d.priceIncVat);
  const maxPrice = Math.max(...prices, 0.1);
  const minPrice = Math.min(...prices, 0);
  const totalRange = maxPrice - minPrice;
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;

  const positiveHeight = totalRange > 0 ? (maxPrice / totalRange) * CHART.HEIGHT : CHART.HEIGHT;
  const negativeHeight = CHART.HEIGHT - positiveHeight;
  const hasNegative = minPrice < 0;

  const priceToY = (p: number) => Math.round(((maxPrice - p) / totalRange) * CHART.HEIGHT);

  // Gridlines at 0 and every 10p
  const gridPrices = new Set<number>();
  if (hasNegative) gridPrices.add(0);
  for (let p = 0; p <= maxPrice + CHART.GRID_INTERVAL; p += CHART.GRID_INTERVAL) {
    if (p >= minPrice && p <= maxPrice + 1) gridPrices.add(p);
  }

  // Time labels every 4 hours
  const timeLabels: { index: number; label: string }[] = [];
  data.forEach((d, i) => {
    const [h, m] = d.time.split(':').map(Number);
    if (m === 0 && h % CHART.TIME_LABEL_INTERVAL === 0) {
      timeLabels.push({ index: i, label: d.time });
    }
  });

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;
  const currentIndex = data.findIndex((d) => d.isCurrentPeriod);

  return (
    <Box>
      {/* Hover info */}
      <div className={styles.hoverInfo}>
        {hoveredItem ? (
          <Group gap="sm">
            <Text size="sm" c="dimmed" ff="monospace">{hoveredItem.time}</Text>
            <Text size="sm" fw={700} ff="monospace" c={getMantinePriceColor(hoveredItem.priceIncVat)}>
              {formatPrice(hoveredItem.priceIncVat)}
            </Text>
            {hoveredItem.isCurrentPeriod && <Text size="xs" c="violet" fw={600}>&#9654; NOW</Text>}
            {isPast(hoveredItem) && <Text size="xs" c="dimmed">past</Text>}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">Hover to inspect &middot; dashed line = average ({average.toFixed(1)}p)</Text>
        )}
      </div>

      {/* Chart */}
      <div className={styles.chartArea}>
        {/* Y-axis */}
        <div className={styles.yAxis} style={{ height: CHART.HEIGHT }}>
          {[...gridPrices].map((p) => (
            <Text key={p} c="dimmed" ff="monospace" className={styles.yLabel} style={{ top: priceToY(p) - 7 }}>
              {p}p
            </Text>
          ))}
        </div>

        {/* Bars + overlays */}
        <div className={styles.barsContainer} style={{ height: CHART.HEIGHT }}>
          {[...gridPrices].map((p) => (
            <div key={p} className={`${styles.gridline} ${p === 0 ? styles.zero : ''}`} style={{ top: priceToY(p) }} />
          ))}

          <div className={styles.avgLine} style={{ top: priceToY(average) }} />

          {currentIndex >= 0 && (
            <div className={styles.nowLine} style={{ left: `${((currentIndex + 0.5) / data.length) * 100}%` }} />
          )}

          <div className={styles.bars}>
            {data.map((item, i) => {
              const past = isPast(item);
              const isPositive = item.priceIncVat >= 0;
              const barH = Math.max((Math.abs(item.priceIncVat) / totalRange) * CHART.HEIGHT, 1);
              const color = getPriceColor(item.priceIncVat, item.isCurrentPeriod);
              const isHovered = hoveredIndex === i;
              const opacity = isHovered ? 1 : past ? 0.25 : item.isCurrentPeriod ? 0.95 : 0.7;

              return (
                <div
                  key={item.id}
                  className={styles.barColumn}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className={styles.positiveZone} style={{ height: positiveHeight }}>
                    {isPositive && (
                      <div className={`${styles.bar} ${styles.positive}`} style={{ height: barH, background: color, opacity }} />
                    )}
                  </div>
                  {hasNegative && (
                    <div className={styles.negativeZone} style={{ height: negativeHeight }}>
                      {!isPositive && (
                        <div className={`${styles.bar} ${styles.negative}`} style={{ height: barH, background: color, opacity }} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hover callout */}
          {hoveredIndex !== null && (() => {
            const item = data[hoveredIndex];
            const leftPct = Math.min(Math.max(((hoveredIndex + 0.5) / data.length) * 100, 8), 92);
            return (
              <div className={styles.callout} style={{ top: Math.max(0, priceToY(item.priceIncVat) - 28), left: `${leftPct}%` }}>
                <Text size="xs" fw={700} ff="monospace" c={getMantinePriceColor(item.priceIncVat)}>
                  {formatPrice(item.priceIncVat)}
                </Text>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Time axis */}
      <div className={styles.timeAxis}>
        <div className={styles.timeAxisSpacer} />
        <div className={styles.timeAxisLabels}>
          {timeLabels.map(({ index, label }) => (
            <Text
              key={`${label}-${index}`}
              size="xs"
              c="dimmed"
              ff="monospace"
              className={styles.timeLabel}
              style={{ left: `${data.length > 1 ? (index / (data.length - 1)) * 100 : 0}%` }}
            >
              {label}
            </Text>
          ))}
        </div>
      </div>

      {/* Legend (no "Now" entry) */}
      <Group gap="md" mt="sm" style={{ flexWrap: 'wrap' }}>
        {CHART_LEGEND.map(({ color, label }) => (
          <Group key={label} gap={5}>
            <div className={styles.legendDot} style={{ background: color }} />
            <Text size="xs" c="dimmed">{label}</Text>
          </Group>
        ))}
      </Group>
    </Box>
  );
};
