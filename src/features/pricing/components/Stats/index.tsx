import { SimpleGrid, Text, Paper, Box } from '@mantine/core';
import { ArrowDown, ArrowUp, ChartBar, Lightning } from 'phosphor-react';
import type { PriceStats } from '../../schemas';
import { formatPrice } from '../../utils';
import { PRICE_THRESHOLDS, STAT_GRADIENTS } from '../../constants';
import styles from './Stats.module.scss';

interface PricingStatsProps {
  stats: PriceStats;
}

interface StatCard {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  iconWeight: 'bold' | 'fill';
  value: number;
  bg: string;
  iconBg: string;
}

function buildCards(stats: PriceStats): StatCard[] {
  const cards: StatCard[] = [
    {
      key: 'min',
      label: 'Lowest',
      icon: ArrowDown,
      iconWeight: 'bold',
      value: stats.min,
      bg: stats.min < 0 ? 'rgba(20,184,166,0.07)' : 'rgba(59,130,246,0.07)',
      iconBg: stats.min < 0 ? STAT_GRADIENTS.teal : STAT_GRADIENTS.blue,
    },
    {
      key: 'max',
      label: 'Highest',
      icon: ArrowUp,
      iconWeight: 'bold',
      value: stats.max,
      bg: stats.max > PRICE_THRESHOLDS.HIGH ? 'rgba(239,68,68,0.07)' : 'rgba(249,115,22,0.07)',
      iconBg: stats.max > PRICE_THRESHOLDS.HIGH ? STAT_GRADIENTS.red : STAT_GRADIENTS.orange,
    },
    {
      key: 'average',
      label: 'Average',
      icon: ChartBar,
      iconWeight: 'bold',
      value: stats.average,
      bg: 'rgba(124,58,237,0.07)',
      iconBg: STAT_GRADIENTS.violet,
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
      bg: cheap ? 'rgba(20,184,166,0.07)' : 'rgba(234,179,8,0.07)',
      iconBg: cheap ? STAT_GRADIENTS.teal : STAT_GRADIENTS.yellow,
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
          <Paper key={card.key} p="md" radius="md" className={styles.card} style={{ background: card.bg }}>
            <div className={styles.cardInner}>
              <div className={styles.iconBox} style={{ background: card.iconBg }}>
                <Icon size={18} weight={card.iconWeight} color="white" />
              </div>
              <Box>
                <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts={0.5}>{card.label}</Text>
                <Text fw={700} size="lg" ff="monospace" lh={1.2}>{formatPrice(card.value)}</Text>
              </Box>
            </div>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
};
