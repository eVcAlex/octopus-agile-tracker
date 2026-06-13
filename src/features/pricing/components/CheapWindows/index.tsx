import { Box, Text, Flex, Paper, SimpleGrid, Badge } from '@mantine/core';
import type { ProcessedSlot } from '../../schemas';
import { formatPrice, getMantinePriceColor } from '../../utils';
import { findCheapestWindows } from '../../cheap-windows';
import styles from './CheapWindows.module.scss';

interface CheapWindowsProps {
  data: ProcessedSlot[];
}

export const CheapWindows = ({ data }: CheapWindowsProps) => {
  const windows = findCheapestWindows(data);

  if (!windows.length) return null;

  return (
    <Box mt="md">
      <Flex align="baseline" gap="xs" mb="xs">
        <Text size="xs" tt="uppercase" fw={600} c="dimmed" lts={0.8}>
          Cheapest windows
        </Text>
        <Text size="xs" c="dimmed">
          &middot; best time to run appliances
        </Text>
      </Flex>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        {windows.map((w) => (
          <Paper
            key={w.durationHours}
            px="sm"
            py="xs"
            radius="md"
            className={styles.windowCard}
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5}>
                {w.durationHours}h
              </Text>
              {w.isActive && (
                <Badge color="violet" variant="light" size="xs">
                  now
                </Badge>
              )}
            </Flex>
            <Text ff="monospace" fw={700} size="sm" lh={1.2}>
              {w.startLabel}&ndash;{w.endLabel}
            </Text>
            <Text
              fw={700}
              ff="monospace"
              size="sm"
              mt={2}
              c={getMantinePriceColor(w.avgPrice) ?? undefined}
            >
              {formatPrice(w.avgPrice)}
              <Text span size="xs" c="dimmed" fw={500}>
                {' '}
                avg
              </Text>
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
    </Box>
  );
};
