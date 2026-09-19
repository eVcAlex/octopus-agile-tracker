import { useState } from 'react';
import {
  Box,
  Flex,
  Stack,
  Text,
  Group,
  Title,
  Loader,
  Paper,
  SegmentedControl,
  Tabs,
  ActionIcon,
  Container,
} from '@mantine/core';
import { Lightning, GearSix, Drop, ChartBar } from 'phosphor-react';
import { usePricingDashboard } from '../../hooks/use-pricing-dashboard';
import { SettingsDrawer } from '../SettingsDrawer';
import { DaySection } from '../Day';
import { RegionPickerModal } from '../RegionPicker';
import { ForecastSection } from '../Forecast';
import { GasSection } from '../Gas';
import { TrendsSection } from '../Trends';
import { UsageSection } from '../Usage';
import { Footer } from '../Footer';
import { ColorModeButton } from '../../../../provider/ColorModeButton';
import styles from './Dashboard.module.scss';

type EnergyType = 'electricity' | 'gas' | 'insights';

export function PricingDashboard() {
  const {
    needsRegion,
    initialLoading,
    lastUpdated,
    settings,
    electricity,
    forecast,
    gas,
    trends,
    usage,
  } = usePricingDashboard();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedType, setEnergyType] = useState<EnergyType>('electricity');
  // Hiding gas while the Gas tab is open drops back to Electricity.
  const energyType: EnergyType =
    selectedType === 'gas' && !settings.showGas ? 'electricity' : selectedType;
  const [selectedDay, setSelectedDay] = useState('today');
  // The Forecast tab only exists for Agile; fall back if the tariff changes.
  const dayTab =
    selectedDay === 'forecast' && !electricity.isAgile ? 'today' : selectedDay;

  if (needsRegion) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <RegionPickerModal opened onSelect={settings.onSetRegion} />
      </Flex>
    );
  }

  if (initialLoading) {
    return (
      <Flex
        justify="center"
        align="center"
        style={{ minHeight: '100vh' }}
        role="status"
        aria-label="Loading pricing data"
      >
        <Stack align="center" gap="lg">
          <div className={styles.loadingLogo}>
            <Lightning size={28} weight="fill" />
          </div>
          <Stack align="center" gap={4}>
            <Title order={4} fw={600}>
              Loading pricing data
            </Title>
            <Text size="sm" c="dimmed">
              Fetching your Octopus rates...
            </Text>
          </Stack>
          <Loader size="sm" color="violet" type="dots" />
        </Stack>
      </Flex>
    );
  }

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);

  return (
    <Container size="lg" py="md" component="main">
      <SettingsDrawer
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        {...settings}
      />

      {/* Header */}
      <Paper
        px="md"
        py="sm"
        mb="md"
        radius="lg"
        withBorder
        className={styles.headerBar}
        component="header"
      >
        <Flex justify="space-between" align="center">
          <Flex align="center" gap="sm">
            <div className={styles.logoIcon} aria-hidden>
              <Lightning size={17} weight="fill" />
            </div>
            <Box>
              <Title
                order={1}
                fw={700}
                size="h4"
                style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
              >
                Octopus Tracker
              </Title>
              {lastUpdated && (
                <Text size="xs" c="dimmed">
                  Updated{' '}
                  <time dateTime={lastUpdated.toISOString()}>
                    {lastUpdated.toLocaleTimeString()}
                  </time>
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
              aria-label="Open settings"
            >
              <GearSix size={18} />
            </ActionIcon>
            <ColorModeButton />
          </Group>
        </Flex>
      </Paper>

      {/* Energy type switcher */}
      <SegmentedControl
        value={energyType}
        onChange={(v) => setEnergyType(v as EnergyType)}
        fullWidth
        size="sm"
        radius="md"
        withItemsBorders={false}
        mb="md"
        color={energyType === 'gas' ? 'orange' : 'violet'}
        data={[
          {
            value: 'electricity',
            label: (
              <Group gap={6} justify="center">
                <Lightning size={14} weight="fill" />
                <span>Electricity</span>
              </Group>
            ),
          },
          ...(settings.showGas
            ? [
                {
                  value: 'gas',
                  label: (
                    <Group gap={6} justify="center">
                      <Drop size={14} weight="fill" />
                      <span>Gas</span>
                    </Group>
                  ),
                },
              ]
            : []),
          {
            value: 'insights',
            label: (
              <Group gap={6} justify="center">
                <ChartBar size={14} weight="fill" />
                <span>Insights</span>
              </Group>
            ),
          },
        ]}
      />

      {/* Insights view: usage spend + price trends */}
      {energyType === 'insights' && (
        <Stack gap="lg">
          <section aria-label="Your usage and spend">
            <Text
              size="xs"
              tt="uppercase"
              fw={700}
              c="dimmed"
              lts={0.8}
              mb="xs"
            >
              Your usage
            </Text>
            <UsageSection
              {...usage}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </section>
          <section aria-label="Price trends">
            <Text
              size="xs"
              tt="uppercase"
              fw={700}
              c="dimmed"
              lts={0.8}
              mb="xs"
            >
              Price trends
            </Text>
            <TrendsSection {...trends} />
          </section>
        </Stack>
      )}

      {/* Gas view */}
      {energyType === 'gas' && <GasSection {...gas} />}

      {/* Electricity view */}
      {energyType === 'electricity' && (
        <>
          {/* Error banner */}
          {electricity.error && (
            <Paper
              mb="md"
              p="sm"
              radius="md"
              className={styles.errorBar}
              role="alert"
            >
              <Text size="sm" c="red">
                {electricity.error}
              </Text>
            </Paper>
          )}

          {/* Day / Forecast tabs */}
          <Tabs
            value={dayTab}
            onChange={(v) => setSelectedDay(v ?? 'today')}
            color="violet"
          >
            <Paper mb="md" radius="lg" withBorder className={styles.tabBar}>
              <Tabs.List
                grow
                style={{ borderBottom: '1px solid var(--surface-border)' }}
                aria-label="Day selector"
              >
                <Tabs.Tab value="today" py="md">
                  <Box>
                    <Text fw={600} size="sm">
                      Today
                    </Text>
                    <Text size="xs" c="dimmed">
                      {fmtDate(today)}
                    </Text>
                  </Box>
                </Tabs.Tab>
                <Tabs.Tab value="tomorrow" py="md">
                  <Box>
                    <Text fw={600} size="sm">
                      Tomorrow
                    </Text>
                    <Text size="xs" c="dimmed">
                      {fmtDate(tomorrow)}
                      {electricity.tomorrowData?.projected && (
                        <Text span size="xs" c="violet.4" fw={600}>
                          {' '}
                          · assumed
                        </Text>
                      )}
                      {!electricity.hasTomorrow &&
                        (electricity.estimate ||
                          electricity.tomorrowForecast) && (
                          <Text span size="xs" c="violet.4" fw={600}>
                            {' '}
                            {electricity.estimate
                              ? '· estimated'
                              : '· forecast'}
                          </Text>
                        )}
                    </Text>
                  </Box>
                </Tabs.Tab>
                {electricity.isAgile && (
                  <Tabs.Tab value="forecast" py="md">
                    <Box>
                      <Text fw={600} size="sm">
                        Forecast
                      </Text>
                      <Text size="xs" c="dimmed">
                        Predictions
                      </Text>
                    </Box>
                  </Tabs.Tab>
                )}
              </Tabs.List>
            </Paper>

            <Tabs.Panel value="today">
              {electricity.todayData ? (
                <DaySection data={electricity.todayData} />
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  No data for today
                </Text>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="tomorrow">
              {electricity.hasTomorrow && electricity.tomorrowData ? (
                <>
                  {electricity.tomorrowData.projected && (
                    <div className={styles.estimateNotice} role="status">
                      <Text size="sm" fw={600}>
                        Assumed to match today. Octopus hasn't listed tomorrow's{' '}
                        {electricity.tariffName} rates yet.
                      </Text>
                      <Text size="xs" c="dimmed">
                        Time-of-use bands normally repeat every day.
                      </Text>
                    </div>
                  )}
                  <DaySection data={electricity.tomorrowData} />
                </>
              ) : electricity.estimate ? (
                <>
                  <div className={styles.estimateNotice} role="status">
                    <Text size="sm" fw={600}>
                      These are estimated rates. Octopus confirms tomorrow's
                      prices around 4pm.
                    </Text>
                    <Text size="xs" c="dimmed">
                      Derived from wholesale day-ahead prices; may differ by a
                      few p/kWh.
                      {electricity.estimateAccuracy &&
                        ` Yesterday's estimate was within ±${electricity.estimateAccuracy.meanAbsError.toFixed(1)}p of confirmed rates on average.`}
                    </Text>
                  </div>
                  <DaySection data={electricity.estimate} />
                </>
              ) : electricity.tomorrowForecast ? (
                <>
                  <div className={styles.estimateNotice} role="status">
                    <Text size="sm" fw={600}>
                      These are forecast rates. The wholesale-based estimate
                      lands around midday.
                    </Text>
                    <Text size="xs" c="dimmed">
                      Predicted by AgilePredict; Octopus confirms tomorrow's
                      prices around 4pm.
                    </Text>
                  </div>
                  <DaySection data={electricity.tomorrowForecast} />
                </>
              ) : (
                <Paper
                  p="xl"
                  radius="lg"
                  withBorder
                  className={styles.emptyState}
                >
                  <Stack align="center" gap="xs">
                    <Text fw={600}>Tomorrow's rates not yet available</Text>
                    <Text size="sm" c="dimmed">
                      Octopus publishes the next day's prices around 4pm
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Tabs.Panel>

            {electricity.isAgile && (
              <Tabs.Panel value="forecast">
                {/* Tomorrow lives on its own tab; the Forecast tab starts at +2 days. */}
                <ForecastSection {...forecast} />
              </Tabs.Panel>
            )}
          </Tabs>

          {electricity.standingCharge != null && (
            <Text size="xs" c="dimmed" mt="md">
              Standing charge: {electricity.standingCharge.toFixed(2)}p/day (inc
              VAT)
            </Text>
          )}
        </>
      )}
      <Footer />
    </Container>
  );
}
