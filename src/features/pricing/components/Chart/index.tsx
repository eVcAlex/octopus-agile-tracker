import { useState } from 'react';
import { Box, Text, Group, useMantineColorScheme } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';

const CHART_HEIGHT = 200;
const Y_AXIS_WIDTH = 36;

function getBarColor(item: ProcessedPriceData, isPast: boolean): string {
  if (item.isCurrentPeriod) return '#7c3aed';
  const base = item.priceIncVat <= 0
    ? '#14b8a6'
    : item.priceIncVat < 10
      ? '#22c55e'
      : item.priceIncVat > 25
        ? '#ef4444'
        : '#f59e0b';
  return base;
}

interface PriceChartProps {
  data: ProcessedPriceData[];
}

export const PriceChart = ({ data }: PriceChartProps) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) return null;

  const now = new Date();
  const prices = data.map((d) => d.priceIncVat);
  const maxPrice = Math.max(...prices, 0.1);
  const minPrice = Math.min(...prices, 0);
  const totalRange = maxPrice - minPrice;
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;

  const positiveHeight = totalRange > 0 ? (maxPrice / totalRange) * CHART_HEIGHT : CHART_HEIGHT;
  const negativeHeight = CHART_HEIGHT - positiveHeight;
  const hasNegative = minPrice < 0;

  // Convert price to Y pixel offset from top of chart area
  const priceToY = (p: number) =>
    Math.round(((maxPrice - p) / totalRange) * CHART_HEIGHT);

  // Gridline prices: 0, and every 10p within range
  const gridPrices: number[] = [];
  if (hasNegative) gridPrices.push(0);
  for (let p = 0; p <= maxPrice + 10; p += 10) {
    if (p >= minPrice && p <= maxPrice + 1) gridPrices.push(p);
  }

  // Time labels every 4 hours
  const timeLabels: { index: number; label: string }[] = [];
  data.forEach((d, i) => {
    const [h, m] = d.time.split(':').map(Number);
    if (m === 0 && h % 4 === 0) timeLabels.push({ index: i, label: d.time });
  });

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  // Find current period index for NOW line
  const currentIndex = data.findIndex((d) => d.isCurrentPeriod);

  return (
    <Box>
      {/* Hover info row */}
      <Box style={{ height: 28, display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        {hoveredItem ? (
          <Group gap="sm">
            <Text size="sm" c="dimmed" ff="monospace">{hoveredItem.time}</Text>
            <Text
              size="sm" fw={700} ff="monospace"
              c={hoveredItem.priceIncVat <= 0 ? 'teal' : hoveredItem.priceIncVat > 25 ? 'red' : undefined}
            >
              {hoveredItem.priceIncVat.toFixed(2)}p
            </Text>
            {hoveredItem.isCurrentPeriod && <Text size="xs" c="violet" fw={600}>▶ NOW</Text>}
            {!hoveredItem.isCurrentPeriod && hoveredItem.validTo < now && (
              <Text size="xs" c="dimmed">past</Text>
            )}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">Hover to inspect · dashed line = average ({average.toFixed(1)}p)</Text>
        )}
      </Box>

      {/* Chart area: Y-axis + bars */}
      <Box style={{ display: 'flex', gap: 0 }}>
        {/* Y-axis labels */}
        <Box style={{ width: Y_AXIS_WIDTH, position: 'relative', height: CHART_HEIGHT, flexShrink: 0 }}>
          {gridPrices.map((p) => (
            <Text
              key={p}
              size="xs"
              c="dimmed"
              ff="monospace"
              style={{
                position: 'absolute',
                right: 6,
                top: priceToY(p) - 7,
                lineHeight: 1,
                fontSize: 10,
              }}
            >
              {p}p
            </Text>
          ))}
        </Box>

        {/* Bars + gridlines */}
        <Box style={{ flex: 1, position: 'relative', height: CHART_HEIGHT }}>
          {/* Gridlines */}
          {gridPrices.map((p) => (
            <Box
              key={p}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: priceToY(p),
                height: 1,
                background: p === 0
                  ? (dark ? '#555' : '#bbb')
                  : (dark ? '#2a2a2a' : '#eee'),
                zIndex: 1,
              }}
            />
          ))}

          {/* Average dashed line */}
          <Box
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: priceToY(average),
              height: 1,
              borderTop: `1.5px dashed ${dark ? '#555' : '#aaa'}`,
              zIndex: 2,
            }}
          />

          {/* NOW vertical line */}
          {currentIndex >= 0 && (
            <Box
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${((currentIndex + 0.5) / data.length) * 100}%`,
                width: 1.5,
                background: 'rgba(124,58,237,0.4)',
                zIndex: 3,
              }}
            />
          )}

          {/* Bars */}
          <Box style={{ display: 'flex', gap: 1, height: '100%', position: 'relative', zIndex: 4 }}>
            {data.map((item, i) => {
              const isPast = !item.isCurrentPeriod && item.validTo < now;
              const isPositive = item.priceIncVat >= 0;
              const barH = Math.max((Math.abs(item.priceIncVat) / totalRange) * CHART_HEIGHT, 1);
              const color = getBarColor(item, isPast);
              const isHovered = hoveredIndex === i;
              const opacity = isHovered ? 1 : isPast ? 0.25 : item.isCurrentPeriod ? 0.95 : 0.7;

              return (
                <Box
                  key={item.id}
                  style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Positive zone */}
                  <Box style={{ height: positiveHeight, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    {isPositive && (
                      <Box style={{
                        height: barH,
                        background: color,
                        borderRadius: '2px 2px 0 0',
                        opacity,
                        transition: 'opacity 0.1s',
                      }} />
                    )}
                  </Box>
                  {/* Negative zone */}
                  {hasNegative && (
                    <Box style={{ height: negativeHeight, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      {!isPositive && (
                        <Box style={{
                          height: barH,
                          background: color,
                          borderRadius: '0 0 2px 2px',
                          opacity,
                          transition: 'opacity 0.1s',
                        }} />
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Hover callout */}
          {hoveredIndex !== null && (() => {
            const item = data[hoveredIndex];
            const yPos = priceToY(item.priceIncVat);
            const leftPct = ((hoveredIndex + 0.5) / data.length) * 100;
            const clampedLeft = Math.min(Math.max(leftPct, 8), 92);
            return (
              <Box style={{
                position: 'absolute',
                top: Math.max(0, yPos - 28),
                left: `${clampedLeft}%`,
                transform: 'translateX(-50%)',
                background: dark ? '#1f1f1f' : '#fff',
                border: `1px solid ${dark ? '#3a3a3a' : '#e4e4e7'}`,
                borderRadius: 5,
                padding: '2px 7px',
                zIndex: 10,
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                whiteSpace: 'nowrap',
              }}>
                <Text size="xs" fw={700} ff="monospace"
                  c={item.priceIncVat <= 0 ? 'teal' : item.priceIncVat > 25 ? 'red' : undefined}
                >
                  {item.priceIncVat.toFixed(2)}p
                </Text>
              </Box>
            );
          })()}
        </Box>
      </Box>

      {/* Time axis */}
      <Box style={{ display: 'flex' }}>
        <Box style={{ width: Y_AXIS_WIDTH, flexShrink: 0 }} />
        <Box style={{ flex: 1, position: 'relative', height: 20, marginTop: 4 }}>
          {timeLabels.map(({ index, label }) => {
            const leftPct = data.length > 1 ? (index / (data.length - 1)) * 100 : 0;
            return (
              <Text
                key={`${label}-${index}`}
                size="xs" c="dimmed" ff="monospace"
                style={{ position: 'absolute', left: `${leftPct}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
              >
                {label}
              </Text>
            );
          })}
        </Box>
      </Box>

      {/* Legend */}
      <Group gap="md" mt="sm" style={{ flexWrap: 'wrap' }}>
        {[
          { color: '#14b8a6', label: 'Free (≤0p)' },
          { color: '#22c55e', label: 'Low (<10p)' },
          { color: '#f59e0b', label: 'Normal' },
          { color: '#ef4444', label: 'High (>25p)' },
          { color: '#7c3aed', label: 'Now' },
        ].map(({ color, label }) => (
          <Group key={label} gap={5} style={{ flexShrink: 0 }}>
            <Box style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <Text size="xs" c="dimmed">{label}</Text>
          </Group>
        ))}
      </Group>
    </Box>
  );
};
