import { Box, Text, Stack, Flex, Paper } from '@mantine/core';
import type { ProcessedPriceData, PriceStats } from '../../types';
import { formatDuration, formatPrice } from '../../utils';
import { CHEAP_WINDOWS } from '../../constants';
import styles from './CheapWindows.module.scss';

interface Window {
  start: string;
  end: string;
  avgPrice: number;
  durationHours: number;
}

function findCheapWindows(data: ProcessedPriceData[], threshold: number): Window[] {
  const windows: Window[] = [];
  let group: ProcessedPriceData[] = [];

  const flush = () => {
    if (group.length < CHEAP_WINDOWS.MIN_SLOTS) {
      group = [];
      return;
    }
    const avg = group.reduce((s, r) => s + r.priceIncVat, 0) / group.length;
    const last = group[group.length - 1];
    const [h, m] = last.time.split(':').map(Number);
    const endMin = h * 60 + m + 30;
    const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    windows.push({ start: group[0].time, end, avgPrice: avg, durationHours: group.length * 0.5 });
    group = [];
  };

  for (const slot of data) {
    slot.priceIncVat <= threshold ? group.push(slot) : flush();
  }
  flush();

  return windows.sort((a, b) => a.avgPrice - b.avgPrice);
}

interface CheapWindowsProps {
  data: ProcessedPriceData[];
  stats: PriceStats;
}

export const CheapWindows = ({ data, stats }: CheapWindowsProps) => {
  const threshold = Math.min(stats.average, CHEAP_WINDOWS.THRESHOLD_CAP);
  const windows = findCheapWindows(data, threshold);

  if (!windows.length) return null;

  return (
    <Box mt="md">
      <Flex align="baseline" gap="xs" mb="xs">
        <Text size="xs" tt="uppercase" fw={600} c="dimmed" lts={0.8}>Cheap windows</Text>
        <Text size="xs" c="dimmed">&middot; below {threshold.toFixed(1)}p avg</Text>
      </Flex>
      <Stack gap="xs">
        {windows.slice(0, CHEAP_WINDOWS.MAX_DISPLAY).map((w, i) => {
          const color = w.avgPrice < 0 ? 'teal' : w.avgPrice < 5 ? 'green' : 'blue';
          return (
            <Paper key={i} px="md" py="sm" radius="md" className={styles.windowCard}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Text ff="monospace" fw={700} size="sm" lh={1.2}>
                    {w.start} &ndash; {w.end}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>{formatDuration(w.durationHours)}</Text>
                </Box>
                <Box ta="right">
                  <Text fw={800} ff="monospace" size="md" c={color} lh={1.2}>
                    {formatPrice(w.avgPrice)}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>avg/slot</Text>
                </Box>
              </Flex>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};
