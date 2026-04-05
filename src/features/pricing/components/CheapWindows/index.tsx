import { Box, Text, Stack, Flex, Paper, useMantineColorScheme } from '@mantine/core';
import type { ProcessedPriceData, PriceStats } from '../../types';

interface Window {
  start: string;
  endDisplay: string;
  avgPrice: number;
  durationHours: number;
}

function findCheapWindows(data: ProcessedPriceData[], threshold: number): Window[] {
  const windows: Window[] = [];
  let group: ProcessedPriceData[] = [];

  const flush = () => {
    if (group.length < 2) { group = []; return; }
    const avg = group.reduce((s, r) => s + r.priceIncVat, 0) / group.length;
    // end time = last slot start + 30 min
    const lastSlot = group[group.length - 1];
    const [h, m] = lastSlot.time.split(':').map(Number);
    const endMin = h * 60 + m + 30;
    const endDisplay = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    windows.push({ start: group[0].time, endDisplay, avgPrice: avg, durationHours: group.length * 0.5 });
    group = [];
  };

  for (const slot of data) {
    if (slot.priceIncVat <= threshold) {
      group.push(slot);
    } else {
      flush();
    }
  }
  flush();

  return windows.sort((a, b) => a.avgPrice - b.avgPrice);
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${hours * 60 | 0}m`;
  const h = Math.floor(hours);
  const m = (hours % 1) * 60;
  return m > 0 ? `${h}h ${m | 0}m` : `${h}h`;
}

interface CheapWindowsProps {
  data: ProcessedPriceData[];
  stats: PriceStats;
}

export const CheapWindows = ({ data, stats }: CheapWindowsProps) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  // Threshold = day average, capped at 15p
  const threshold = Math.min(stats.average, 15);
  const windows = findCheapWindows(data, threshold);

  if (!windows.length) return null;

  return (
    <Box mt="md">
      <Flex align="baseline" gap="xs" mb="xs">
        <Text size="xs" tt="uppercase" fw={600} c="dimmed" lts={0.8}>
          Cheap windows
        </Text>
        <Text size="xs" c="dimmed">
          · below {threshold.toFixed(1)}p avg
        </Text>
      </Flex>
      <Stack gap="xs">
        {windows.slice(0, 5).map((w, i) => {
          const isVeryChip = w.avgPrice < 5;
          const isFree = w.avgPrice < 0;
          const priceColor = isFree ? 'teal' : isVeryChip ? 'green' : 'blue';
          const bgColor = dark
            ? isFree ? 'rgba(20,184,166,0.07)' : isVeryChip ? 'rgba(34,197,94,0.06)' : 'rgba(59,130,246,0.05)'
            : isFree ? 'rgba(20,184,166,0.06)' : isVeryChip ? 'rgba(34,197,94,0.05)' : 'rgba(59,130,246,0.04)';
          const borderColor = dark
            ? isFree ? 'rgba(20,184,166,0.2)' : isVeryChip ? 'rgba(34,197,94,0.18)' : '#2a2a2a'
            : isFree ? 'rgba(20,184,166,0.18)' : isVeryChip ? 'rgba(34,197,94,0.15)' : '#eee';

          return (
            <Paper
              key={i}
              px="md"
              py="sm"
              radius="md"
              style={{ background: bgColor, border: `1px solid ${borderColor}` }}
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text ff="monospace" fw={700} size="sm" lh={1.2}>
                    {w.start} – {w.endDisplay}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {formatDuration(w.durationHours)}
                  </Text>
                </Box>
                <Box ta="right">
                  <Text fw={800} ff="monospace" size="md" c={priceColor} lh={1.2}>
                    {w.avgPrice.toFixed(2)}p
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    avg/slot
                  </Text>
                </Box>
              </Flex>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};
