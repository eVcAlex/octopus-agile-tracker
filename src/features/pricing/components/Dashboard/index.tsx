import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Button,
  Spinner,
  Group,
} from '@chakra-ui/react';
import { usePricing } from '../../hooks/use-pricing';
import { OctopusRegion } from '../../types';
import { PricingStats } from '../Stats';
import { PricingTable } from '../Table';
import { ColorModeButton } from '../../../../components/ui/color-mode';

export function PricingDashboard() {
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
      <Flex justify="center" align="center" minH="100vh">
        <Stack textAlign="center">
          <Spinner size="xl" />
          <Text fontSize="lg">Loading Octopus Agile pricing data...</Text>
        </Stack>
      </Flex>
    );
  }

  return (
    <Box maxW="7xl" mx="auto" px={4} py={8}>
      {/* Header */}
      <Box borderWidth={1} borderRadius="md" shadow="sm" mb={6}>
        <Flex justify="space-between" align="center" p={4}>
          <Box>
            <Heading size="lg">Octopus Agile Price Tracker</Heading>
            {lastUpdated && (
              <Text color="gray.500" mt={1}>
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </Text>
            )}
          </Box>
          <Group>
            <Button colorScheme="blue" variant="outline" onClick={refreshData}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <ColorModeButton />
          </Group>
        </Flex>

        {/* Region Native Select */}
        <Box p={4}>
          <select
            value={currentRegion}
            onChange={(e) => setRegion(e.target.value as OctopusRegion)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #CBD5E0',
            }}
          >
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Box
          borderWidth={1}
          borderRadius="md"
          p={4}
          mb={6}
          bg="red.50"
          borderColor="red.200"
        >
          <Text color="red.600">{error}</Text>
        </Box>
      )}

      {/* Today's Data */}
      {todayData && (
        <Box borderWidth={1} borderRadius="md" shadow="sm" mb={6}>
          <Box p={4}>
            <Heading size="md">
              Today's Rates - {new Date().toLocaleDateString()}
            </Heading>
          </Box>
          <Box p={4}>
            <PricingStats stats={todayData.stats} title="Today" />
            <Box mt={6}>
              <PricingTable data={todayData.rates} loading={loading} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Tomorrow's Data */}
      {tomorrowData && (
        <Box borderWidth={1} borderRadius="md" shadow="sm" mb={6}>
          <Box p={4}>
            <Heading size="md">
              Tomorrow's Rates -{' '}
              {new Date(Date.now() + 86400000).toLocaleDateString()}
            </Heading>
          </Box>
          <Box p={4}>
            <PricingStats stats={tomorrowData.stats} title="Tomorrow" />
            <Box mt={6}>
              <PricingTable data={tomorrowData.rates} loading={loading} />
            </Box>
          </Box>
        </Box>
      )}

      {/* No Data */}
      {!todayData && !tomorrowData && !loading && (
        <Box borderWidth={1} borderRadius="md" p={12} textAlign="center">
          <Heading size="md" color="gray.500" mb={2}>
            No pricing data available
          </Heading>
          <Text color="gray.400">
            Please try refreshing the data or check your connection
          </Text>
        </Box>
      )}
    </Box>
  );
}
