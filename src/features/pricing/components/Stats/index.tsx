import { Box, SimpleGrid, Text, Paper } from '@mantine/core';
import { ArrowUp, ArrowDown, ChartBar, Lightning } from 'phosphor-react';
import type { PriceStats } from '../../types';

interface PricingStatsProps {
  stats: PriceStats;
  title: string;
}

export const PricingStats = ({ stats, title }: PricingStatsProps) => {
  const formatPrice = (price: number) => `${price.toFixed(2)}p`;

  const StatCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Paper p="sm" shadow="sm" radius="md">
      <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Box
          style={{
            padding: 8,
            borderRadius: 6,
            background: `${color}.1`,
            color: `${color}.6`,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Text size="sm" color="dimmed">
            {title}
          </Text>
          <Text fw={700} style={{ fontFamily: 'monospace' }}>
            {value}
          </Text>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <Box mb="md">
      <Text fw={500} mb="sm">
        {title} - Statistics
      </Text>
      <SimpleGrid cols={4} spacing="sm">
        <StatCard
          title="Minimum Price"
          value={formatPrice(stats.min)}
          icon={<ArrowDown size={24} />}
          color={stats.min < 0 ? 'green' : 'blue'}
        />
        <StatCard
          title="Maximum Price"
          value={formatPrice(stats.max)}
          icon={<ArrowUp size={24} />}
          color={stats.max > 25 ? 'red' : 'yellow'}
        />
        <StatCard
          title="Average Price"
          value={formatPrice(stats.average)}
          icon={<ChartBar size={24} />}
          color="blue"
        />
        {stats.current !== undefined && (
          <StatCard
            title="Current Price"
            value={formatPrice(stats.current)}
            icon={<Lightning size={24} />}
            color={stats.current < stats.average ? 'green' : 'yellow'}
          />
        )}
      </SimpleGrid>
    </Box>
  );
};
