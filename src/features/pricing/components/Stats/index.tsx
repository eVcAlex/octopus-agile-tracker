import { SimpleGrid, Text, Paper, Box } from '@mantine/core';
import {
  ArrowDown,
  ArrowUp,
  ChartBar,
  Lightning,
  type Icon as PhosphorIcon,
} from 'phosphor-react';
import type { PriceStats } from '../../schemas';
import { formatPrice } from '../../utils';
import { PRICE_THRESHOLDS, PRICE_COLORS, STAT_ACCENTS } from '../../constants';
import styles from './Stats.module.scss';

interface PricingStatsProps {
  stats: PriceStats;
}

interface StatCard {
  key: string;
  label: string;
  icon: PhosphorIcon;
  iconWeight: 'bold' | 'fill';
  value: number;
  /** CSS var reference driving both the card tint and the icon badge. */
  accent: string;
  live?: boolean;
}

function buildCards(stats: PriceStats): StatCard[] {
  const cards: StatCard[] = [
    {
      key: 'min',
      label: 'Lowest',
      icon: ArrowDown,
      iconWeight: 'bold',
      value: stats.min,
      accent: stats.min < 0 ? PRICE_COLORS.free : STAT_ACCENTS.blue,
    },
    {
      key: 'max',
      label: 'Highest',
      icon: ArrowUp,
      iconWeight: 'bold',
      value: stats.max,
      accent:
        stats.max > PRICE_THRESHOLDS.HIGH
          ? PRICE_COLORS.high
          : STAT_ACCENTS.orange,
    },
    {
      key: 'average',
      label: 'Average',
      icon: ChartBar,
      iconWeight: 'bold',
      value: stats.average,
      accent: PRICE_COLORS.current,
    },
  ];

  if (stats.current !== undefined) {
    const cheap = stats.current < stats.average;
    cards.push({
      key: 'current',
      label: 'Right Now',
      icon: Lightning,
      iconWeight: 'fill',
      value: stats.current,
      accent: cheap ? PRICE_COLORS.free : STAT_ACCENTS.yellow,
      live: true,
    });
  }

  return cards;
}

export const PricingStats = ({ stats }: PricingStatsProps) => {
  const cards = buildCards(stats);

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Paper
            key={card.key}
            p="md"
            radius="md"
            className={`${styles.card} ${card.live ? styles.live : ''}`}
            style={{ '--accent': card.accent } as React.CSSProperties}
          >
            <div className={styles.cardInner}>
              <div className={styles.iconBox}>
                <Icon size={18} weight={card.iconWeight} />
              </div>
              <Box>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.6}>
                  {card.label}
                </Text>
                <Text
                  fw={700}
                  size="xl"
                  ff="monospace"
                  lh={1.15}
                  className={styles.value}
                >
                  {formatPrice(card.value)}
                </Text>
              </Box>
            </div>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
};
