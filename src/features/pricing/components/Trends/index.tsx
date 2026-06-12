import { useState } from 'react';
import {
  Box,
  Text,
  Stack,
  Group,
  Paper,
  Loader,
  Button,
  SimpleGrid,
} from '@mantine/core';
import { ArrowClockwise } from 'phosphor-react';
import type { DailyAverage } from '../../api/octopusApi';
import { getPriceColor, formatPrice } from '../../utils';
import styles from './Trends.module.scss';

function fmtDay(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function TrendChart({ history }: { history: DailyAverage[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxAvg = Math.max(...history.map((d) => d.average));
  const minAvg = Math.min(...history.map((d) => d.average), 0);
  const range = maxAvg - minAvg || 1;

  const labelIndices = new Set([
    0,
    Math.floor(history.length / 2),
    history.length - 1,
  ]);

  return (
    <Box>
      <div className={styles.chart}>
        {history.map((day, i) => {
          const heightPct = ((day.average - minAvg) / range) * 85 + 10;
          return (
            <div
              key={day.date}
              className={styles.bar}
              style={{
                height: `${heightPct}%`,
                background: getPriceColor(day.average),
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === i && (
                <div className={styles.tooltip}>
                  <Text size="xs" fw={600}>
                    {fmtDay(day.date)}
                  </Text>
                  <Text size="xs" ff="monospace">
                    avg {formatPrice(day.average)}
                  </Text>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {formatPrice(day.min)} – {formatPrice(day.max)}
                  </Text>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.labels}>
        {history.map((day, i) =>
          labelIndices.has(i) ? (
            <Text key={day.date} size="xs" c="dimmed" ff="monospace">
              {fmtDay(day.date)}
            </Text>
          ) : null
        )}
      </div>
    </Box>
  );
}

function Summary({ history }: { history: DailyAverage[] }) {
  const overall =
    history.reduce((s, d) => s + d.average, 0) / (history.length || 1);
  const cheapest = history.reduce((a, b) => (b.average < a.average ? b : a));
  const dearest = history.reduce((a, b) => (b.average > a.average ? b : a));

  const cards = [
    { label: '30-day average', value: formatPrice(overall), sub: 'per kWh' },
    {
      label: 'Cheapest day',
      value: formatPrice(cheapest.average),
      sub: fmtDay(cheapest.date),
    },
    {
      label: 'Most expensive',
      value: formatPrice(dearest.average),
      sub: fmtDay(dearest.date),
    },
  ];

  return (
    <SimpleGrid cols={3} spacing="sm">
      {cards.map((c) => (
        <Paper key={c.label} p="md" radius="md" className={styles.summaryCard}>
          <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts={0.5}>
            {c.label}
          </Text>
          <Text fw={700} size="lg" ff="monospace" lh={1.2}>
            {c.value}
          </Text>
          <Text size="xs" c="dimmed">
            {c.sub}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

interface TrendsSectionProps {
  history: DailyAverage[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function TrendsSection({
  history,
  loading,
  error,
  onRefresh,
}: TrendsSectionProps) {
  if (loading) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Loader size="sm" color="violet" type="dots" />
        <Text size="sm" c="dimmed">
          Loading price history…
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack align="center" py="xl" gap="xs">
        <Text size="sm" c="red">
          {error}
        </Text>
        <Button
          variant="light"
          color="violet"
          size="xs"
          onClick={onRefresh}
          leftSection={<ArrowClockwise size={14} />}
        >
          Retry
        </Button>
      </Stack>
    );
  }

  if (!history.length) {
    return (
      <Text ta="center" c="dimmed" py="xl">
        No historical data available
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Summary history={history} />
      <Box>
        <Group justify="space-between" align="baseline" mb={6}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
            Daily average price · last {history.length} days
          </Text>
        </Group>
        <TrendChart history={history} />
      </Box>
    </Stack>
  );
}
