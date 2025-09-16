import {
  Box,
  Flex,
  Stack,
  Text,
  Button,
  Select,
  Group,
  Title,
  Loader,
} from '@mantine/core';
import { usePricing } from '../../hooks/use-pricing';
import { OctopusRegion } from '../../types';
import { PricingStats } from '../Stats';
import { PricingTable } from '../Table';
import { ColorModeButton } from '../../../../provider/ColorModeButton';

export const PricingDashboard = () => {
  const {
    todayData,
    tomorrowData,
    loading,
    error,
    lastUpdated,
    refreshData,
    setRegion,
    currentRegion,
  } = usePricing();

  const regionOptions = Object.values(OctopusRegion);

  if (loading && !todayData && !tomorrowData) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <Stack align="center">
          <Loader size="xl" />
          <Text size="lg">Loading Octopus Agile pricing data...</Text>
        </Stack>
      </Flex>
    );
  }

  return (
    <Box mx="auto" p="md" style={{ maxWidth: 1200 }}>
      <Box
        mb="md"
        p="md"
        style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}
      >
        <Flex justify="space-between" align="center" mb="sm">
          <Box>
            <Title order={2}>Octopus Agile Price Tracker</Title>
            {lastUpdated && (
              <Text color="dimmed" size="sm">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </Text>
            )}
          </Box>
          <Group gap="sm">
            <Button variant="outline" onClick={refreshData}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <ColorModeButton />
          </Group>
        </Flex>

        <Select
          value={currentRegion}
          onChange={(val) => setRegion(val as OctopusRegion)}
          data={regionOptions.map((r) => ({ value: r, label: r }))}
          placeholder="Select Region"
        />
      </Box>

      {error && (
        <Box
          mb="md"
          p="md"
          style={{
            border: '1px solid #f44336',
            borderRadius: 8,
            background: '#ffebee',
          }}
        >
          <Text color="red">{error}</Text>
        </Box>
      )}

      {todayData && (
        <Box
          mb="md"
          p="md"
          style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}
        >
          <Text fw={500} mb="sm">
            Today's Rates - {new Date().toLocaleDateString()}
          </Text>
          <PricingStats stats={todayData.stats} title="Today" />
          <Box mt="md">
            <PricingTable data={todayData.rates} loading={loading} />
          </Box>
        </Box>
      )}

      {tomorrowData && (
        <Box
          mb="md"
          p="md"
          style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}
        >
          <Text fw={500} mb="sm">
            Tomorrow's Rates -{' '}
            {new Date(Date.now() + 86400000).toLocaleDateString()}
          </Text>
          <PricingStats stats={tomorrowData.stats} title="Tomorrow" />
          <Box mt="md">
            <PricingTable data={tomorrowData.rates} loading={loading} />
          </Box>
        </Box>
      )}

      {!todayData && !tomorrowData && !loading && (
        <Box
          p="xl"
          style={{
            textAlign: 'center',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
          }}
        >
          <Text fw={500} size="lg" color="dimmed" mb="sm">
            No pricing data available
          </Text>
          <Text color="dimmed">
            Please try refreshing the data or check your connection
          </Text>
        </Box>
      )}
    </Box>
  );
};
