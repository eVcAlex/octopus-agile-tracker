import { useState, useRef } from 'react';
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
  Modal,
  Button,
  TextInput,
} from '@mantine/core';
import {
  Lightning,
  GearSix,
  MapPin,
  CalendarBlank,
  Drop,
  MagicWand,
} from 'phosphor-react';
import { usePricing } from '../../hooks/use-pricing';
import { fetchAccountDetails } from '../../api/accountApi';
import { useForecast } from '../../hooks/use-forecast';
import { useGas } from '../../hooks/use-gas';
import { useStandingCharges } from '../../hooks/use-standing-charges';
import { useHistory } from '../../hooks/use-history';
import { useUsage } from '../../hooks/use-usage';
import {
  REGIONS,
  REGION_LABELS,
  type Region,
  type DailyPrices,
} from '../../schemas';
import { PricingStats } from '../Stats';
import { PricingTable } from '../Table';
import { PriceChart } from '../Chart';
import { HeatmapView } from '../Heatmap';
import { ForecastSection } from '../Forecast';
import { GasSection } from '../Gas';
import { CheapWindows } from '../CheapWindows';
import { TrendsSection } from '../Trends';
import { UsageSection } from '../Usage';
import { ColorModeButton } from '../../../../provider/ColorModeButton';
import styles from './Dashboard.module.scss';

const regionOptions = REGIONS.map((code) => ({
  value: code,
  label: REGION_LABELS[code],
}));

type View = 'grid' | 'chart' | 'table';

// ─── Day section (grid / chart / table) ───

function DaySection({
  data,
  loading,
}: {
  data: DailyPrices;
  loading: boolean;
}) {
  const [view, setView] = useState<View>('chart');

  return (
    <section aria-label="Price visualisation">
      <PricingStats stats={data.stats} />

      <CheapWindows data={data.rates} />

      <SegmentedControl
        value={view}
        onChange={(v) => setView(v as View)}
        size="sm"
        radius="md"
        fullWidth
        withItemsBorders={false}
        mt="md"
        mb="md"
        aria-label="View type"
        data={[
          { value: 'chart', label: 'Chart' },
          { value: 'grid', label: 'Grid' },
          { value: 'table', label: 'Table' },
        ]}
      />

      {view === 'grid' && <HeatmapView data={data.rates} />}
      {view === 'chart' && <PriceChart data={data.rates} />}
      {view === 'table' && <PricingTable data={data.rates} loading={loading} />}
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

type EnergyType = 'electricity' | 'gas';

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
  const {
    forecast,
    loading: forecastLoading,
    error: forecastError,
    refresh: refreshForecast,
    lastUpdated: forecastUpdated,
  } = useForecast(currentRegion, hasTomorrow, forecastDays);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [energyType, setEnergyType] = useState<EnergyType>('electricity');
  const [gasProductDraft, setGasProductDraft] = useState(gasProduct);
  const [apiKeyDraft, setApiKeyDraft] = useState(apiKey);
  const [accountNoDraft, setAccountNoDraft] = useState(accountNo);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectSuccess, setDetectSuccess] = useState<string | null>(null);
  const detectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleAutoDetect() {
    if (!apiKeyDraft || !accountNoDraft) return;
    setDetecting(true);
    setDetectError(null);
    setDetectSuccess(null);
    try {
      const details = await fetchAccountDetails(
        apiKeyDraft.trim(),
        accountNoDraft.trim().toUpperCase()
      );
      setApiKey(apiKeyDraft.trim());
      setAccountNo(accountNoDraft.trim().toUpperCase());
      if (details.gasProductCode) {
        setGasProduct(details.gasProductCode);
        setGasProductDraft(details.gasProductCode);
        setDetectSuccess(`Gas: ${details.gasProductCode}`);
      } else {
        setDetectError('No active gas tariff found on this account.');
      }
    } catch {
      setDetectError(
        'Could not fetch account. Check your API key and account number.'
      );
    } finally {
      setDetecting(false);
      if (detectTimeoutRef.current) clearTimeout(detectTimeoutRef.current);
      detectTimeoutRef.current = setTimeout(() => {
        setDetectSuccess(null);
        setDetectError(null);
      }, 5000);
    }
  }

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
      {/* Settings drawer */}
      <Drawer
        opened={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setGasProductDraft(gasProduct);
          setApiKeyDraft(apiKey);
          setAccountNoDraft(accountNo);
        }}
        title="Settings"
        position="right"
        size="sm"
      >
        <Stack gap="lg" pt="xs">
          {/* Electricity */}
          <Stack gap="xs">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={0.8}>
              ⚡ Electricity
            </Text>
            <Select
              label="Region"
              description="Your electricity network region"
              value={currentRegion}
              onChange={(val) => {
                if (val) setRegion(val as Region);
              }}
              data={regionOptions}
              leftSection={<MapPin size={16} />}
            />
            <Select
              label="Forecast days"
              description="Days of predictions to show"
              value={String(forecastDays)}
              onChange={(val) => {
                if (val) setForecastDays(parseInt(val, 10));
              }}
              data={[
                { value: '3', label: '3 days' },
                { value: '5', label: '5 days' },
                { value: '7', label: '7 days' },
                { value: '10', label: '10 days' },
                { value: '14', label: '14 days' },
              ]}
              leftSection={<CalendarBlank size={16} />}
            />
          </Stack>

          {/* Account auto-detect */}
          <Stack gap="xs">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={0.8}>
              🔑 Octopus Account
            </Text>
            <Text size="xs" c="dimmed">
              Enter your API key and account number to auto-detect your gas
              tariff. Find them at <strong>octopus.energy → Account</strong>.
            </Text>
            <TextInput
              label="API key"
              placeholder="sk_live_..."
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.currentTarget.value.trim())}
              type="password"
            />
            <TextInput
              label="Account number"
              placeholder="A-XXXXXXXX"
              value={accountNoDraft}
              onChange={(e) =>
                setAccountNoDraft(e.currentTarget.value.trim().toUpperCase())
              }
              ff="monospace"
            />
            <Button
              color="violet"
              variant="light"
              size="sm"
              leftSection={<MagicWand size={15} />}
              loading={detecting}
              disabled={!apiKeyDraft || !accountNoDraft}
              onClick={handleAutoDetect}
            >
              Auto-detect tariffs
            </Button>
            {detectSuccess && (
              <Text size="xs" c="green">
                ✓ Detected — {detectSuccess}
              </Text>
            )}
            {detectError && (
              <Text size="xs" c="red">
                {detectError}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              Your API key and account number are stored only in this browser
              and sent only to the Octopus Energy API.
            </Text>
            {(apiKey || accountNo) && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => {
                  setApiKey('');
                  setAccountNo('');
                  setApiKeyDraft('');
                  setAccountNoDraft('');
                }}
              >
                Clear stored credentials
              </Button>
            )}
          </Stack>

          {/* Gas */}
          <Stack gap="xs">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={0.8}>
              🔥 Gas
            </Text>
            <TextInput
              label="Gas product code"
              description="Auto-detected above, or enter manually"
              placeholder="e.g. SILVER-24-07-01"
              value={gasProductDraft}
              onChange={(e) =>
                setGasProductDraft(e.currentTarget.value.trim().toUpperCase())
              }
              leftSection={<Drop size={16} />}
              ff="monospace"
            />
            {gasProductDraft !== gasProduct && (
              <Button
                size="sm"
                color="orange"
                onClick={() => setGasProduct(gasProductDraft)}
              >
                Save gas product code
              </Button>
            )}
          </Stack>
        </Stack>
      </Drawer>

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
        ]}
      />

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
          onSetProduct={(code) => {
            setGasProduct(code);
            setGasProductDraft(code);
          }}
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
                <Tabs.Tab value="trends" py="md">
                  <Box>
                    <Text fw={600} size="sm">
                      Trends
                    </Text>
                    <Text size="xs" c="dimmed">
                      Past 30 days
                    </Text>
                  </Box>
                </Tabs.Tab>
                <Tabs.Tab value="usage" py="md">
                  <Box>
                    <Text fw={600} size="sm">
                      Usage
                    </Text>
                    <Text size="xs" c="dimmed">
                      Your spend
                    </Text>
                  </Box>
                </Tabs.Tab>
              </Tabs.List>
            </Paper>

            <Tabs.Panel value="today">
              {todayData ? (
                <DaySection data={todayData} loading={loading} />
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  No data for today
                </Text>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="tomorrow">
              {hasTomorrow && tomorrowData ? (
                <DaySection data={tomorrowData} loading={loading} />
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

            <Tabs.Panel value="trends">
              <TrendsSection
                history={history}
                loading={historyLoading}
                error={historyError}
                onRefresh={refreshHistory}
              />
            </Tabs.Panel>

            <Tabs.Panel value="usage">
              <UsageSection
                spend={usage.spend}
                flexibleRate={usage.flexibleRate}
                loading={usage.loading}
                error={usage.error}
                needsCredentials={usage.needsCredentials}
                noData={usage.noData}
                onOpenSettings={() => setSettingsOpen(true)}
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
