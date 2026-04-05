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
  Badge,
  SegmentedControl,
  Tabs,
  Drawer,
  ActionIcon,
  useMantineColorScheme,
  Container,
} from '@mantine/core';
import { usePricing } from '../../hooks/use-pricing';
import { OctopusRegion } from '../../types';
import type { DailyPriceData } from '../../types';
import { PricingStats } from '../Stats';
import { PricingTable } from '../Table';
import { PriceChart } from '../Chart';
import { CheapWindows } from '../CheapWindows';
import { HeatmapView } from '../Heatmap';
import { Lightning, GearSix, MapPin } from 'phosphor-react';
import { ColorModeButton } from '../../../../provider/ColorModeButton';

const REGION_LABELS: Record<string, string> = {
  A: 'Eastern England',
  B: 'East Midlands',
  C: 'London',
  D: 'Merseyside & N. Wales',
  E: 'West Midlands',
  F: 'North East England',
  G: 'North West England',
  H: 'Southern England',
  J: 'South East England',
  K: 'South West England',
  L: 'Yorkshire',
  M: 'South Wales',
  N: 'Scotland',
  P: 'South Scotland',
};

interface DaySectionProps {
  data: DailyPriceData;
  loading: boolean;
  dark: boolean;
}

const DaySection = ({ data, loading, dark }: DaySectionProps) => {
  const [view, setView] = useState<'table' | 'heat' | 'chart'>('table');

  return (
    <Box>
      <Flex justify="flex-end" mb="md">
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as 'table' | 'heat' | 'chart')}
          size="xs"
          radius="md"
          data={[
            { value: 'heat', label: 'Heat' },
            { value: 'chart', label: 'Chart' },
            { value: 'table', label: 'Table' },
          ]}
        />
      </Flex>

      {view === 'heat' && (
        <>
          <HeatmapView data={data.rates} />
          <CheapWindows data={data.rates} stats={data.stats} />
        </>
      )}

      {view === 'chart' && (
        <>
          <PriceChart data={data.rates} />
          <CheapWindows data={data.rates} stats={data.stats} />
          <Box mt="md">
            <PricingStats stats={data.stats} />
          </Box>
        </>
      )}

      {view === 'table' && (
        <>
          <PricingStats stats={data.stats} />
          <Box mt="md">
            <PricingTable data={data.rates} loading={loading} />
          </Box>
        </>
      )}
    </Box>
  );
};

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

  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const [settingsOpen, setSettingsOpen] = useState(false);

  const regionOptions = Object.entries(OctopusRegion).map(([, value]) => ({
    value,
    label: REGION_LABELS[value] || value,
  }));

  const hasTomorrow = (tomorrowData?.rates.length ?? 0) > 0;
  const defaultTab = hasTomorrow ? 'tomorrow' : 'today';

  if (loading && !todayData && !tomorrowData) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <Stack align="center" gap="lg">
          <Box style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightning size={28} weight="fill" color="white" />
          </Box>
          <Stack align="center" gap={4}>
            <Title order={4} fw={600}>Loading pricing data</Title>
            <Text size="sm" c="dimmed">Fetching Octopus Agile rates...</Text>
          </Stack>
          <Loader size="sm" color="violet" type="dots" />
        </Stack>
      </Flex>
    );
  }

  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <Container size="lg" py="md">
      {/* Settings Drawer */}
      <Drawer
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        position="right"
        size="sm"
        styles={{
          content: { background: dark ? '#1a1a1a' : '#fff' },
          header: { background: dark ? '#1a1a1a' : '#fff' },
        }}
      >
        <Stack gap="md" pt="xs">
          <Select
            label="Region"
            description="Your electricity network region"
            value={currentRegion}
            onChange={(val) => { setRegion(val as OctopusRegion); setSettingsOpen(false); }}
            data={regionOptions}
            leftSection={<MapPin size={16} />}
          />
        </Stack>
      </Drawer>

      {/* Header */}
      <Paper
        px="md"
        py="sm"
        mb="md"
        radius="lg"
        withBorder
        style={{ borderColor: dark ? '#2a2a2a' : '#e9ecef', background: dark ? '#1a1a1a' : '#fff' }}
      >
        <Flex justify="space-between" align="center">
          <Flex align="center" gap="sm">
            <Box style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lightning size={17} weight="fill" color="white" />
            </Box>
            <Box>
              <Title order={4} fw={700} style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Agile Tracker
              </Title>
              {lastUpdated && (
                <Text size="xs" c="dimmed">
                  Updated {new Date(lastUpdated).toLocaleTimeString()}
                </Text>
              )}
            </Box>
          </Flex>
          <Group gap="xs">
            <ActionIcon
              variant="light"
              color="gray"
              size="lg"
              radius="md"
              onClick={() => setSettingsOpen(true)}
            >
              <GearSix size={18} />
            </ActionIcon>
            <ColorModeButton />
          </Group>
        </Flex>
      </Paper>

      {/* Error */}
      {error && (
        <Paper mb="md" p="sm" radius="md" style={{ background: dark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)', border: `1px solid ${dark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
          <Text size="sm" c="red">{error}</Text>
        </Paper>
      )}

      {/* Today / Tomorrow tabs */}
      <Tabs defaultValue={defaultTab} color="violet">
        <Paper
          mb="md"
          radius="lg"
          withBorder
          style={{ borderColor: dark ? '#2a2a2a' : '#e9ecef', background: dark ? '#1a1a1a' : '#fff', overflow: 'hidden' }}
        >
          <Tabs.List grow style={{ borderBottom: `1px solid ${dark ? '#2a2a2a' : '#e9ecef'}` }}>
            <Tabs.Tab value="today" py="md">
              <Box>
                <Text fw={600} size="sm">Today</Text>
                <Text size="xs" c="dimmed">{fmtDate(today)}</Text>
              </Box>
            </Tabs.Tab>
            <Tabs.Tab
              value="tomorrow"
              py="md"
              rightSection={
                <Badge size="xs" color={hasTomorrow ? 'violet' : 'gray'} variant="light" radius="sm">
                  {hasTomorrow ? 'Available' : 'Pending'}
                </Badge>
              }
            >
              <Box>
                <Text fw={600} size="sm">Tomorrow</Text>
                <Text size="xs" c="dimmed">{fmtDate(tomorrow)}</Text>
              </Box>
            </Tabs.Tab>
          </Tabs.List>
        </Paper>

        <Tabs.Panel value="today">
          {todayData ? (
            <DaySection data={todayData} loading={loading} dark={dark} />
          ) : (
            <Text ta="center" c="dimmed" py="xl">No data for today</Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="tomorrow">
          {hasTomorrow && tomorrowData ? (
            <DaySection data={tomorrowData} loading={loading} dark={dark} />
          ) : (
            <Paper p="xl" radius="lg" withBorder style={{ textAlign: 'center', borderColor: dark ? '#2a2a2a' : '#e9ecef', background: dark ? '#1a1a1a' : '#fff' }}>
              <Stack align="center" gap="xs">
                <Text fw={600}>Tomorrow's rates not yet available</Text>
                <Text size="sm" c="dimmed">Octopus publishes the next day's prices around 4pm</Text>
              </Stack>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};
