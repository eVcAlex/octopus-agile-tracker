import { useState } from 'react';
import { Box, Text, Group, Loader, Stack, ActionIcon, Tooltip } from '@mantine/core';
import { ArrowClockwise } from 'phosphor-react';
import type { ForecastData, ForecastPrice } from '../../schemas';
import { getPriceColor, formatPrice } from '../../utils';
import { CHART, PRICE_COLORS } from '../../constants';
import styles from './Forecast.module.scss';

const CHART_HEIGHT = 180;

function getGridPrices(min: number, max: number): number[] {
  const prices = new Set<number>();
  if (min < 0) prices.add(0);
  for (let p = 0; p <= max + 10; p += 10) {
    if (p >= min && p <= max + 1) prices.add(p);
  }
  return [...prices];
}

// ─── Chart sub-component ───
function ForecastChart({ slots }: { slots: ForecastPrice[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const lows = slots.map((s) => s.agile_low);
  const highs = slots.map((s) => s.agile_high);
  const maxPrice = Math.max(...highs, 0.1);
  const minPrice = Math.min(...lows, 0);
  const range = maxPrice - minPrice;

  const priceToY = (p: number) => Math.round(((maxPrice - p) / range) * CHART_HEIGHT);
  const gridPrices = getGridPrices(minPrice, maxPrice);

  const timeLabels: { index: number; label: string }[] = [];
  slots.forEach((s, i) => {
    const h = new Date(s.date_time).getHours();
    const m = new Date(s.date_time).getMinutes();
    if (m === 0 && h % CHART.TIME_LABEL_INTERVAL === 0) {
      timeLabels.push({ index: i, label: `${String(h).padStart(2, '0')}:00` });
    }
  });

  const hoveredSlot = hoveredIndex !== null ? slots[hoveredIndex] : null;
  const cheapestIndex = slots.reduce(
    (best, s, i) => (s.agile_pred < slots[best].agile_pred ? i : best),
    0,
  );
  const cheapestSlot = slots[cheapestIndex];

  return (
    <Box p="md">
      {/* Cheapest period callout */}
      <div className={styles.cheapestBar}>
        <Text size="xs" c="dimmed">Cheapest period:</Text>
        <Text size="xs" fw={700} style={{ color: getPriceColor(cheapestSlot.agile_pred) }}>
          {new Date(cheapestSlot.date_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {formatPrice(cheapestSlot.agile_pred)}
        </Text>
      </div>

      {/* Hover info */}
      <div style={{ height: 26, display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        {hoveredSlot ? (
          <Group gap="sm">
            <Text size="sm" c="dimmed" ff="monospace">
              {new Date(hoveredSlot.date_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text size="sm" fw={700} ff="monospace" style={{ color: getPriceColor(hoveredSlot.agile_pred) }}>
              {formatPrice(hoveredSlot.agile_pred)}
            </Text>
            <Text size="xs" c="dimmed">
              range: {formatPrice(hoveredSlot.agile_low)} – {formatPrice(hoveredSlot.agile_high)}
            </Text>
          </Group>
        ) : (
          <Text size="xs" c="dimmed">Tap or hover a bar to inspect prices</Text>
        )}
      </div>

      {/* Chart */}
      <div className={styles.chartArea}>
        <div className={styles.yAxis} style={{ height: CHART_HEIGHT }}>
          {gridPrices.map((p) => (
            <Text key={p} c="dimmed" ff="monospace" className={styles.yLabel} style={{ top: priceToY(p) - 7 }}>
              {p}p
            </Text>
          ))}
        </div>

        <div className={styles.chartContainer} style={{ height: CHART_HEIGHT }}>
          {/* Gridlines */}
          {gridPrices.map((p) => (
            <div key={p} className={`${styles.gridline} ${p === 0 ? styles.zero : ''}`} style={{ top: priceToY(p) }} />
          ))}

          {/* Confidence band */}
          {slots.map((s, i) => {
            const top = priceToY(s.agile_high);
            const bottom = priceToY(s.agile_low);
            return (
              <div
                key={`band-${i}`}
                className={styles.confidenceBand}
                style={{
                  top,
                  height: Math.max(bottom - top, 1),
                  left: `${(i / slots.length) * 100}%`,
                  width: `${(1 / slots.length) * 100}%`,
                }}
              />
            );
          })}

          {/* Bars */}
          <div className={styles.bars}>
            {slots.map((s, i) => {
              const barH = Math.max((Math.abs(s.agile_pred - Math.min(minPrice, 0)) / range) * CHART_HEIGHT, 1);
              const color = getPriceColor(s.agile_pred);
              const isHovered = hoveredIndex === i;
              const isCheapest = i === cheapestIndex;

              return (
                <div
                  key={i}
                  className={`${styles.barColumn} ${isCheapest ? styles.cheapestCol : ''}`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onTouchStart={() => setHoveredIndex(i)}
                  onTouchEnd={() => setHoveredIndex(null)}
                >
                  <div
                    className={styles.bar}
                    style={{ height: barH, background: color, opacity: isHovered ? 1 : 0.75 }}
                  />
                  {isCheapest && <div className={styles.cheapestMarker} />}
                </div>
              );
            })}
          </div>

          {/* Callout */}
          {hoveredIndex !== null && (() => {
            const s = slots[hoveredIndex];
            const leftPct = Math.min(Math.max(((hoveredIndex + 0.5) / slots.length) * 100, 8), 92);
            return (
              <div className={styles.callout} style={{ top: Math.max(0, priceToY(s.agile_pred) - 52), left: `${leftPct}%` }}>
                <Text size="xs" fw={700} ff="monospace" style={{ color: getPriceColor(s.agile_pred) }}>
                  {formatPrice(s.agile_pred)}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {formatPrice(s.agile_low)} – {formatPrice(s.agile_high)}
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
              style={{ left: `${slots.length > 1 ? (index / (slots.length - 1)) * 100 : 0}%` }}
            >
              {label}
            </Text>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendBar} style={{ background: `linear-gradient(to right, ${PRICE_COLORS.low}, ${PRICE_COLORS.normal}, ${PRICE_COLORS.high})` }} />
          <Text size="xs" c="dimmed">Predicted price</Text>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendBand} />
          <Text size="xs" c="dimmed">Uncertainty range</Text>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendCheapest} />
          <Text size="xs" c="dimmed">Cheapest slot</Text>
        </div>
      </div>
    </Box>
  );
}

// ─── Main component ───
interface ForecastViewProps {
  forecast: ForecastData;
  region: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export const ForecastView = ({ forecast, region, lastUpdated, onRefresh, refreshing }: ForecastViewProps) => {
  const [selectedDay, setSelectedDay] = useState(0);

  if (forecast.days.length === 0) {
    return (
      <Stack align="center" py="xl" gap="xs">
        <Text fw={600}>No forecast days available</Text>
        <Text size="sm" c="dimmed">Future predictions will appear here once published by AgilePredict</Text>
      </Stack>
    );
  }

  const day = forecast.days[Math.min(selectedDay, forecast.days.length - 1)];

  return (
    <Box>
      {/* Day selector + region + refresh */}
      <Group justify="space-between" mb="xs" wrap="nowrap" align="flex-start">
        <div className={styles.daySelector}>
          {forecast.days.map((d, i) => (
            <button
              key={d.date}
              className={`${styles.dayChip} ${i === selectedDay ? styles.active : ''}`}
              onClick={() => setSelectedDay(i)}
            >
              <Text size="xs" fw={600} lh={1.2}>{d.label}</Text>
            </button>
          ))}
        </div>

        <Tooltip label={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'} position="left">
          <ActionIcon
            variant="light"
            color="violet"
            size="md"
            radius="md"
            onClick={onRefresh}
            loading={refreshing}
            style={{ flexShrink: 0 }}
          >
            <ArrowClockwise size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <div className={styles.wrapper}>
        {/* Disclaimer with region */}
        <div className={styles.disclaimer}>
          <Text size="xs" c="dimmed">
            Predictions for <strong>{region}</strong> via AgilePredict · not confirmed rates
          </Text>
        </div>

        <ForecastChart slots={day.slots} />
      </div>
    </Box>
  );
};

// Loading/Error wrapper
interface ForecastSectionProps {
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  region: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export const ForecastSection = ({ forecast, loading, error, region, lastUpdated, onRefresh }: ForecastSectionProps) => {
  if (loading && !forecast) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Loader size="sm" color="violet" type="dots" />
        <Text size="sm" c="dimmed">Loading forecast...</Text>
      </Stack>
    );
  }

  if (error && !forecast) {
    return (
      <Stack align="center" py="xl" gap="xs">
        <Text size="sm" c="red">{error}</Text>
        <Text size="xs" c="dimmed">Forecast data from AgilePredict may be temporarily unavailable</Text>
        <ActionIcon variant="light" color="violet" size="md" radius="md" onClick={onRefresh} mt="xs">
          <ArrowClockwise size={16} />
        </ActionIcon>
      </Stack>
    );
  }

  if (!forecast) return null;

  return (
    <ForecastView
      forecast={forecast}
      region={region}
      lastUpdated={lastUpdated}
      onRefresh={onRefresh}
      refreshing={loading}
    />
  );
};
