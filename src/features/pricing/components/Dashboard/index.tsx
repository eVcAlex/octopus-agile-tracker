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
  ActionIcon,
  Container,
  Modal,
  Button,
} from '@mantine/core';
import {
  Lightning,
  GearSix,
  MapPin,
  Drop,
  ChartBar,
  SquaresFour,
} from 'phosphor-react';
import { usePricing } from '../../hooks/use-pricing';
import { useForecast } from '../../hooks/use-forecast';
import { useGas } from '../../hooks/use-gas';
import { useStandingCharges } from '../../hooks/use-standing-charges';
import { useHistory } from '../../hooks/use-history';
import { useUsage } from '../../hooks/use-usage';
import { useNotifications } from '../../hooks/use-notifications';
import {
  REGIONS,
  REGION_LABELS,
  type Region,
  type DailyPrices,
} from '../../schemas';
import { SettingsDrawer } from '../SettingsDrawer';
import { useEstimate } from '../../hooks/use-estimate';
import { useEstimateAccuracy } from '../../hooks/use-estimate-accuracy';
import { tomorrowForecastAsDailyPrices } from '../../api/forecastApi';
import { PricingStats } from '../Stats';
import { PeriodList } from '../PeriodList';
import { PriceChart } from '../Chart';
import { ForecastSection } from '../Forecast';
import { GasSection } from '../Gas';
import { CheapWindows } from '../CheapWindows';
import { CurrentSlotBanner } from '../CurrentSlotBanner';
import { TrendsSection } from '../Trends';
import { UsageSection } from '../Usage';
import { ColorModeButton } from '../../../../provider/ColorModeButton';
import styles from './Dashboard.module.scss';

const regionOptions = REGIONS.map((code) => ({
  value: code,
  label: REGION_LABELS[code],
}));

type View = 'grid' | 'chart';

// ─── Day section (grid / chart / table) ───

function DaySection({ data }: { data: DailyPrices }) {
  const [view, setView] = useState<View>('chart');

  return (
    <section aria-label="Price visualisation">
      <PricingStats stats={data.stats} />

      <CurrentSlotBanner data={data.rates} />

      <CheapWindows data={data.rates} />

      <Group justify="flex-end" mt="md" mb="md">
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as View)}
          size="sm"
          radius="md"
          withItemsBorders={false}
          aria-label="View type"
          styles={{
            // Inline SVG labels leave descender space below the icon.
            label: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          }}
          data={[
            {
              value: 'chart',
              label: (
                <ChartBar
                  size={17}
                  weight={view === 'chart' ? 'fill' : 'regular'}
                  aria-label="Chart"
                />
              ),
            },
            {
              value: 'grid',
              label: (
                <SquaresFour
                  size={17}
                  weight={view === 'grid' ? 'fill' : 'regular'}
                  aria-label="Grid"
                />
              ),
            },
          ]}
        />
      </Group>

      {view === 'chart' ? (
        <PriceChart data={data.rates} />
      ) : (
        <PeriodList data={data.rates} />
      )}
    </section>
  );
}

// ─── Region picker modal (first-time users) ───

function RegionPickerModal({
  opened,
  onSelect,
}: {
  opened: boolean;
  onSelect: (r: Region) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      title="Welcome to Octopus Tracker"
      centered
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      aria-label="Select your electricity region"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select your electricity region to see accurate Octopus Agile prices.
        </Text>
        <Select
          label="Your region"
          placeholder="Select your region..."
          data={regionOptions}
          value={selected}
          onChange={setSelected}
          leftSection={<MapPin size={16} />}
          searchable
          aria-required
        />
        <Button
          color="violet"
          fullWidth
          disabled={!selected}
          onClick={() => selected && onSelect(selected as Region)}
        >
          Get started
        </Button>
      </Stack>
    </Modal>
  );
}

// ─── Main dashboard ───

type EnergyType = 'electricity' | 'gas' | 'insights';

export function PricingDashboard() {
  const {
    todayData,
    tomorrowData,
    loading,
    error,
    lastUpdated,
    setRegion,
    currentRegion,
    needsRegion,
    forecastDays,
    setForecastDays,
    gasProduct,
    setGasProduct,
    apiKey,
    setApiKey,
    accountNo,
    setAccountNo,
  } = usePricing();
  const hasTomorrow = (tomorrowData?.rates.length ?? 0) > 0;
  const estimate = useEstimate(currentRegion, !hasTomorrow);
  const estimateAccuracy = useEstimateAccuracy(currentRegion, !hasTomorrow);
  const {
    forecast,
    loading: forecastLoading,
    error: forecastError,
    refresh: refreshForecast,
    lastUpdated: forecastUpdated,
  } = useForecast(currentRegion, hasTomorrow, forecastDays);
  // Pre-auction fallback: before the day-ahead auction clears (~midday) there
  // is no wholesale estimate, so show AgilePredict's ML forecast instead.
  const tomorrowForecast =
    !hasTomorrow && !estimate.estimate
      ? tomorrowForecastAsDailyPrices(forecast)
      : null;
  const {
    rates: gasRates,
    currentRate: gasCurrentRate,
    loading: gasLoading,
    error: gasError,
    lastUpdated: gasUpdated,
    refresh: refreshGas,
  } = useGas(currentRegion, gasProduct);
  const { elecStandingCharge, gasStandingCharge } = useStandingCharges(
    currentRegion,
    gasProduct
  );
  const {
    history,
    loading: historyLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useHistory(currentRegion);
  const usage = useUsage(currentRegion, apiKey, accountNo);
  const notifications = useNotifications(currentRegion);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [energyType, setEnergyType] = useState<EnergyType>('electricity');

  if (needsRegion) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <RegionPickerModal opened onSelect={setRegion} />
      </Flex>
    );
  }

  if (loading && !todayData && !tomorrowData) {
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
            <Lightning size={28} weight="fill" color="white" />
          </div>
          <Stack align="center" gap={4}>
            <Title order={4} fw={600}>
              Loading pricing data
            </Title>
            <Text size="sm" c="dimmed">
              Fetching Octopus Agile rates...
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
        region={currentRegion}
        onSetRegion={setRegion}
        forecastDays={forecastDays}
        onSetForecastDays={setForecastDays}
        gasProduct={gasProduct}
        onSetGasProduct={setGasProduct}
        apiKey={apiKey}
        onSetApiKey={setApiKey}
        accountNo={accountNo}
        onSetAccountNo={setAccountNo}
        notifications={notifications}
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
              <Lightning size={17} weight="fill" color="white" />
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
          {
            value: 'gas',
            label: (
              <Group gap={6} justify="center">
                <Drop size={14} weight="fill" />
                <span>Gas</span>
              </Group>
            ),
          },
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
              spend={usage.spend}
              flexibleRate={usage.flexibleRate}
              loading={usage.loading}
              error={usage.error}
              needsCredentials={usage.needsCredentials}
              noData={usage.noData}
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
            <TrendsSection
              history={history}
              loading={historyLoading}
              error={historyError}
              onRefresh={refreshHistory}
            />
          </section>
        </Stack>
      )}

      {/* Gas view */}
      {energyType === 'gas' && (
        <GasSection
          rates={gasRates}
          currentRate={gasCurrentRate}
          loading={gasLoading}
          error={gasError}
          lastUpdated={gasUpdated}
          gasProduct={gasProduct}
          onRefresh={refreshGas}
          onSetProduct={setGasProduct}
          standingCharge={gasStandingCharge}
        />
      )}

      {/* Electricity view */}
      {energyType === 'electricity' && (
        <>
          {/* Error banner */}
          {error && (
            <Paper
              mb="md"
              p="sm"
              radius="md"
              className={styles.errorBar}
              role="alert"
            >
              <Text size="sm" c="red">
                {error}
              </Text>
            </Paper>
          )}

          {/* Day / Forecast tabs */}
          <Tabs defaultValue="today" color="violet">
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
                      {!hasTomorrow &&
                        (estimate.estimate || tomorrowForecast) && (
                          <Text span size="xs" c="violet.4" fw={600}>
                            {' '}
                            {estimate.estimate ? '· estimated' : '· forecast'}
                          </Text>
                        )}
                    </Text>
                  </Box>
                </Tabs.Tab>
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
              </Tabs.List>
            </Paper>

            <Tabs.Panel value="today">
              {todayData ? (
                <DaySection data={todayData} />
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  No data for today
                </Text>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="tomorrow">
              {hasTomorrow && tomorrowData ? (
                <DaySection data={tomorrowData} />
              ) : estimate.estimate ? (
                <>
                  <div className={styles.estimateNotice} role="status">
                    <Text size="sm" fw={600}>
                      These are estimated rates — Octopus confirms tomorrow's
                      prices around 4pm.
                    </Text>
                    <Text size="xs" c="dimmed">
                      Derived from wholesale day-ahead prices; may differ by a
                      few p/kWh.
                      {estimateAccuracy &&
                        ` Yesterday's estimate was within ±${estimateAccuracy.meanAbsError.toFixed(1)}p of confirmed rates on average.`}
                    </Text>
                  </div>
                  <DaySection data={estimate.estimate} />
                </>
              ) : tomorrowForecast ? (
                <>
                  <div className={styles.estimateNotice} role="status">
                    <Text size="sm" fw={600}>
                      These are forecast rates — the wholesale-based estimate
                      lands around midday.
                    </Text>
                    <Text size="xs" c="dimmed">
                      Predicted by AgilePredict; Octopus confirms tomorrow's
                      prices around 4pm.
                    </Text>
                  </div>
                  <DaySection data={tomorrowForecast} />
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

          {elecStandingCharge != null && (
            <Text size="xs" c="dimmed" mt="md">
              Standing charge: {elecStandingCharge.toFixed(2)}p/day (inc VAT)
            </Text>
          )}
        </>
      )}
    </Container>
  );
}
