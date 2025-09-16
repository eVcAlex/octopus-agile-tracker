import { Box, Flex, SimpleGrid, Text, Heading } from '@chakra-ui/react';
import { ArrowUp, ArrowDown, ChartBar, Lightning } from 'phosphor-react';
import type { PriceStats } from '../../types';

interface PricingStatsProps {
  stats: PriceStats;
  title: string;
}

export function PricingStats({ stats, title }: PricingStatsProps) {
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
    <Box p={4} borderWidth={1} borderRadius="md" shadow="sm">
      <Flex align="center" gap={3}>
        <Box p={3} borderRadius="md" bg={`${color}.100`} color={`${color}.600`}>
          {icon}
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.500">
            {title}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" fontFamily="monospace">
            {value}
          </Text>
        </Box>
      </Flex>
    </Box>
  );

  return (
    <Box mb={6}>
      <Heading size="md" mb={4}>
        {title} - Statistics
      </Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
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
}
