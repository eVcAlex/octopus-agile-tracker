import {
  Box,
  SimpleGrid,
  Text,
  Paper,
  useMantineColorScheme,
} from '@mantine/core';
import { ArrowDown, ArrowUp, ChartBar, Lightning } from 'phosphor-react';
import type { PriceStats } from '../../types';

interface PricingStatsProps {
  stats: PriceStats;
}

const STAT_CONFIGS = [
  {
    key: 'min' as const,
    label: 'Lowest',
    icon: ArrowDown,
    getColor: (val: number) =>
      val < 0 ? ('teal' as const) : ('blue' as const),
    getBg: (val: number, dark: boolean) =>
      val < 0
        ? dark
          ? 'rgba(20, 184, 166, 0.08)'
          : 'rgba(20, 184, 166, 0.06)'
        : dark
          ? 'rgba(59, 130, 246, 0.08)'
          : 'rgba(59, 130, 246, 0.06)',
    getIconBg: (val: number) =>
      val < 0
        ? 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)'
        : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  },
  {
    key: 'max' as const,
    label: 'Highest',
    icon: ArrowUp,
    getColor: (val: number) =>
      val > 25 ? ('red' as const) : ('orange' as const),
    getBg: (val: number, dark: boolean) =>
      val > 25
        ? dark
          ? 'rgba(239, 68, 68, 0.08)'
          : 'rgba(239, 68, 68, 0.06)'
        : dark
          ? 'rgba(249, 115, 22, 0.08)'
          : 'rgba(249, 115, 22, 0.06)',
    getIconBg: (val: number) =>
      val > 25
        ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
        : 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  },
  {
    key: 'average' as const,
    label: 'Average',
    icon: ChartBar,
    getColor: () => 'violet' as const,
    getBg: (_val: number, dark: boolean) =>
      dark
        ? 'rgba(124, 58, 237, 0.08)'
        : 'rgba(124, 58, 237, 0.06)',
    getIconBg: () =>
      'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  },
];

export const PricingStats = ({ stats }: PricingStatsProps) => {
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  const formatPrice = (price: number) => `${price.toFixed(2)}p`;

  const cards = STAT_CONFIGS.map((config) => ({
    ...config,
    value: stats[config.key],
  }));

  if (stats.current !== undefined) {
    cards.push({
      key: 'current' as const,
      label: 'Right Now',
      icon: Lightning,
      getColor: () =>
        stats.current! < stats.average ? ('teal' as const) : ('yellow' as const),
      getBg: (_val: number, dark: boolean) =>
        stats.current! < stats.average
          ? dark
            ? 'rgba(20, 184, 166, 0.08)'
            : 'rgba(20, 184, 166, 0.06)'
          : dark
            ? 'rgba(234, 179, 8, 0.08)'
            : 'rgba(234, 179, 8, 0.06)',
      getIconBg: () =>
        stats.current! < stats.average
          ? 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)'
          : 'linear-gradient(135deg, #ca8a04 0%, #eab308 100%)',
      value: stats.current!,
    });
  }

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Paper
            key={card.key}
            p="md"
            radius="md"
            style={{
              background: card.getBg(card.value, dark),
              border: 'none',
            }}
          >
            <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: card.getIconBg(card.value),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon
                  size={18}
                  weight={card.key === 'current' ? 'fill' : 'bold'}
                  color="white"
                />
              </Box>
              <Box>
                <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts={0.5}>
                  {card.label}
                </Text>
                <Text
                  fw={700}
                  size="lg"
                  ff="monospace"
                  style={{ lineHeight: 1.2 }}
                >
                  {formatPrice(card.value)}
                </Text>
              </Box>
            </Box>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
};
