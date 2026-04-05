import { useState } from 'react';
import { Box, Text, Group, useMantineColorScheme } from '@mantine/core';
import type { ProcessedPriceData } from '../../types';

const CHART_HEIGHT = 150;

function getBarColor(item: ProcessedPriceData): string {
  if (item.isCurrentPeriod) return '#7c3aed';
  if (item.priceIncVat < 0) return '#14b8a6';
  if (item.priceIncVat < 10) return '#22c55e';
  if (item.priceIncVat > 25) return '#ef4444';
  return '#f59e0b';
}

interface PriceChartProps {
  data: ProcessedPriceData[];
}

export const PriceChart = ({ data }: PriceChartProps) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) return null;

  const prices = data.map((d) => d.priceIncVat);
  const maxPrice = Math.max(...prices, 0.1);
  const minPrice = Math.min(...prices, 0);
  const totalRange = maxPrice - minPrice;

  const positiveHeight = (maxPrice / totalRange) * CHART_HEIGHT;
  const negativeHeight = (Math.abs(minPrice) / totalRange) * CHART_HEIGHT;
  const hasNegative = minPrice < 0;

  // Time labels: every 4 hours
  const timeLabels: { index: number; label: string }[] = [];
  data.forEach((d, i) => {
    const [h, m] = d.time.split(':').map(Number);
    if (m === 0 && h % 4 === 0) timeLabels.push({ index: i, label: d.time });
  });
  if (data.length > 1) {
    timeLabels.push({ index: data.length - 1, label: data[data.length - 1].time });
  }

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <Box>
      {/* Hover info */}
      <Box style={{ height: 24, display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        {hoveredItem ? (
          <Group gap="xs">
            <Text size="sm" c="dimmed" ff="monospace">
              {hoveredItem.time}
            </Text>
            <Text
              size="sm"
              fw={700}
              ff="monospace"
              c={
                hoveredItem.priceIncVat < 0
                  ? 'teal'
                  : hoveredItem.priceIncVat > 25
                    ? 'red'
                    : undefined
              }
            >
              {hoveredItem.priceIncVat.toFixed(2)}p
            </Text>
            {hoveredItem.isCurrentPeriod && (
              <Text size="xs" c="violet" fw={600}>
                ← now
              </Text>
            )}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            Hover bars to inspect prices
          </Text>
        )}
      </Box>

      {/* Bars */}
      <Box style={{ position: 'relative', overflow: 'visible' }}>
        {/* Floating price callout */}
        {hoveredIndex !== null && (() => {
          const item = data[hoveredIndex];
          const isPositive = item.priceIncVat >= 0;
          const barH = Math.max((Math.abs(item.priceIncVat) / totalRange) * CHART_HEIGHT, 1);
          const topOffset = Math.max(0, isPositive ? positiveHeight - barH - 30 : positiveHeight - 30);
          const leftPct = ((hoveredIndex + 0.5) / data.length) * 100;
          const clampedLeft = Math.min(Math.max(leftPct, 6), 94);
          return (
            <Box
              style={{
                position: 'absolute',
                top: topOffset,
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
              }}
            >
              <Text
                size="xs"
                fw={700}
                ff="monospace"
                c={item.priceIncVat < 0 ? 'teal' : item.priceIncVat > 25 ? 'red' : undefined}
              >
                {item.priceIncVat.toFixed(2)}p
              </Text>
            </Box>
          );
        })()}

        {hasNegative && (
          <Box
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: positiveHeight,
              height: 1,
              background: dark ? '#3a3a3a' : '#ddd',
              zIndex: 2,
            }}
          />
        )}

        <Box style={{ display: 'flex', gap: 1.5, height: CHART_HEIGHT }}>
          {data.map((item, i) => {
            const isPositive = item.priceIncVat >= 0;
            const barH = Math.max(
              (Math.abs(item.priceIncVat) / totalRange) * CHART_HEIGHT,
              1,
            );
            const color = getBarColor(item);
            const isHovered = hoveredIndex === i;

            return (
              <Box
                key={item.id}
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', cursor: 'crosshair' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Positive zone */}
                <Box
                  style={{
                    height: positiveHeight,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                >
                  {isPositive && (
                    <Box
                      style={{
                        height: barH,
                        background: color,
                        borderRadius: '2px 2px 0 0',
                        opacity: isHovered ? 1 : item.isCurrentPeriod ? 0.92 : 0.62,
                        transition: 'opacity 0.1s',
                      }}
                    />
                  )}
                </Box>

                {/* Negative zone */}
                {hasNegative && (
                  <Box
                    style={{
                      height: negativeHeight,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {!isPositive && (
                      <Box
                        style={{
                          height: barH,
                          background: color,
                          borderRadius: '0 0 2px 2px',
                          opacity: isHovered ? 1 : 0.62,
                          transition: 'opacity 0.1s',
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Box style={{ height: 1, background: dark ? '#2a2a2a' : '#eee' }} />
      </Box>

      {/* Time axis */}
      <Box style={{ position: 'relative', height: 20, marginTop: 4 }}>
        {timeLabels.map(({ index, label }) => {
          const leftPct = data.length > 1 ? (index / (data.length - 1)) * 100 : 0;
          return (
            <Text
              key={`${label}-${index}`}
              size="xs"
              c="dimmed"
              ff="monospace"
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Text>
          );
        })}
      </Box>

      {/* Legend */}
      <Group gap="md" mt="md" style={{ flexWrap: 'wrap' }}>
        {[
          { color: '#14b8a6', label: 'Free' },
          { color: '#22c55e', label: 'Low <10p' },
          { color: '#f59e0b', label: 'Normal' },
          { color: '#ef4444', label: 'High >25p' },
          { color: '#7c3aed', label: 'Right now' },
        ].map(({ color, label }) => (
          <Group key={label} gap={5} style={{ flexShrink: 0 }}>
            <Box style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <Text size="xs" c="dimmed">
              {label}
            </Text>
          </Group>
        ))}
      </Group>
    </Box>
  );
};
