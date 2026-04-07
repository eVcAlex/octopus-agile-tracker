import { useState } from 'react';
import {
  Box,
  Flex,
  Stack,
  Text,
  Select,
  Group,
  Title,
  Loader,
  Paper,
  SegmentedControl,
  Tabs,
  Drawer,
  ActionIcon,
  Container,
} from '@mantine/core';
import { Lightning, GearSix, MapPin } from 'phosphor-react';
import { usePricing } from '../../hooks/use-pricing';
import { useForecast } from '../../hooks/use-forecast';
import { OctopusRegion } from '../../types';
import type { DailyPriceData, OctopusRegion as OctopusRegionType } from '../../types';
import { PricingStats } from '../Stats';
import { PricingTable } from '../Table';
import { PriceChart } from '../Chart';
import { HeatmapView } from '../Heatmap';
import { ForecastSection } from '../Forecast';
import { ColorModeButton } from '../../../../provider/ColorModeButton';
import styles from './Dashboard.module.scss';

const REGION_LABELS: Record<string, string> = {
  A: 'Eastern England', B: 'East Midlands', C: 'London',
  D: 'Merseyside & N. Wales', E: 'West Midlands', F: 'North East England',
  G: 'North West England', H: 'Southern England', J: 'South East England',
  K: 'South West England', L: 'Yorkshire', M: 'South Wales',
  N: 'Scotland', P: 'South Scotland',
};

type View = 'grid' | 'chart' | 'table';

interface DaySectionProps {
  data: DailyPriceData;
  loading: boolean;
}

const DaySection = ({ data, loading }: DaySectionProps) => {
  const [view, setView] = useState<View>('grid');

  return (
    <Box>
      <PricingStats stats={data.stats} />

      <SegmentedControl
        value={view}
        onChange={(v) => setView(v as View)}
        size="sm"
        radius="md"
        fullWidth
        withItemsBorders={false}
        mt="md"
        mb="md"
        data={[
          { value: 'grid', label: 'Grid' },
          { value: 'chart', label: 'Chart' },
          { value: 'table', label: 'Table' },
        ]}
      />

      {view === 'grid' && <HeatmapView data={data.rates} />}
      {view === 'chart' && <PriceChart data={data.rates} />}
      {view === 'table' && <PricingTable data={data.rates} loading={loading} />}
    </Box>
  );
};

export const PricingDashboard = () => {
  const { todayData, tomorrowData, loading, error, lastUpdated, setRegion, currentRegion } = usePricing();
  const { forecast, loading: forecastLoading, error: forecastError, refresh: refreshForecast, lastUpdated: forecastUpdated } = useForecast(currentRegion);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const regionOptions = Object.entries(OctopusRegion).map(([, value]) => ({
    value,
    label: REGION_LABELS[value] || value,
  }));

  const hasTomorrow = (tomorrowData?.rates.length ?? 0) > 0;

  if (loading && !todayData && !tomorrowData) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <Stack align="center" gap="lg">
          <div className={styles.loadingLogo}>
            <Lightning size={28} weight="fill" color="white" />
          </div>
          <Stack align="center" gap={4}>
            <Title order={4} fw={600}>Loading pricing data</Title>
            <Text size="sm" c="dimmed">Fetching Octopus Agile rates...</Text>
          </Stack>
          <Loader size="sm" color="violet" type="dots" />
        </Stack>
      </Flex>
    );
  }

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);

  return (
    <Container size="lg" py="md">
      {/* Settings */}
      <Drawer
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        position="right"
        size="sm"
      >
        <Stack gap="md" pt="xs">
          <Select
            label="Region"
            description="Your electricity network region"
            value={currentRegion}
            onChange={(val) => { setRegion(val as OctopusRegionType); setSettingsOpen(false); }}
            data={regionOptions}
            leftSection={<MapPin size={16} />}
          />
        </Stack>
      </Drawer>

      {/* Header */}
      <Paper px="md" py="sm" mb="md" radius="lg" withBorder className={styles.headerBar}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap="sm">
            <div className={styles.logoIcon}>
              <Lightning size={17} weight="fill" color="white" />
            </div>
            <Box>
              <Title order={4} fw={700} style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Agile Tracker
              </Title>
              {lastUpdated && (
                <Text size="xs" c="dimmed">Updated {new Date(lastUpdated).toLocaleTimeString()}</Text>
              )}
            </Box>
          </Flex>
          <Group gap="xs">
            <ActionIcon variant="light" color="gray" size="lg" radius="md" onClick={() => setSettingsOpen(true)}>
              <GearSix size={18} />
            </ActionIcon>
            <ColorModeButton />
          </Group>
        </Flex>
      </Paper>

      {/* Error */}
      {error && (
        <Paper mb="md" p="sm" radius="md" className={styles.errorBar}>
          <Text size="sm" c="red">{error}</Text>
        </Paper>
      )}

      {/* Tabs */}
      <Tabs defaultValue="today" color="violet">
        <Paper mb="md" radius="lg" withBorder className={styles.tabBar}>
          <Tabs.List grow style={{ borderBottom: '1px solid var(--surface-border)' }}>
            <Tabs.Tab value="today" py="md">
              <Box>
                <Text fw={600} size="sm">Today</Text>
                <Text size="xs" c="dimmed">{fmtDate(today)}</Text>
              </Box>
            </Tabs.Tab>
            <Tabs.Tab value="tomorrow" py="md">
              <Box>
                <Text fw={600} size="sm">Tomorrow</Text>
                <Text size="xs" c="dimmed">{fmtDate(tomorrow)}</Text>
              </Box>
            </Tabs.Tab>
            <Tabs.Tab value="forecast" py="md">
              <Box>
                <Text fw={600} size="sm">Forecast</Text>
                <Text size="xs" c="dimmed">Predictions</Text>
              </Box>
            </Tabs.Tab>
          </Tabs.List>
        </Paper>

        <Tabs.Panel value="today">
          {todayData ? (
            <DaySection data={todayData} loading={loading} />
          ) : (
            <Text ta="center" c="dimmed" py="xl">No data for today</Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="tomorrow">
          {hasTomorrow && tomorrowData ? (
            <DaySection data={tomorrowData} loading={loading} />
          ) : (
            <Paper p="xl" radius="lg" withBorder className={styles.emptyState}>
              <Stack align="center" gap="xs">
                <Text fw={600}>Tomorrow's rates not yet available</Text>
                <Text size="sm" c="dimmed">Octopus publishes the next day's prices around 4pm</Text>
              </Stack>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="forecast">
          <ForecastSection
            forecast={forecast}
            loading={forecastLoading}
            error={forecastError}
            region={REGION_LABELS[currentRegion] ?? currentRegion}
            lastUpdated={forecastUpdated}
            onRefresh={refreshForecast}
          />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};
