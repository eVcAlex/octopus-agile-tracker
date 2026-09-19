import { useState } from 'react';
import {
  Box,
  Text,
  Paper,
  Stack,
  Group,
  Loader,
  TextInput,
  Button,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import { Drop, ArrowClockwise, TrendUp, TrendDown } from 'phosphor-react';
import dayjs from 'dayjs';
import { dailyGasRates, gasRateAt } from '../../api/gasApi';
import type { GasRate } from '../../schemas';
import styles from './Gas.module.scss';

// ─── History bar chart ───

function GasHistoryChart({ rates }: { rates: GasRate[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Show last 30 days, oldest first for chart display
  const display = rates.slice(0, 30).reverse();
  if (!display.length) return null;

  const maxRate = Math.max(...display.map((r) => r.unitRateIncVat));
  const minRate = Math.min(...display.map((r) => r.unitRateIncVat));
  const range = maxRate - minRate || 1;

  // Label first, middle, and last
  const labelIndices = new Set([
    0,
    Math.floor(display.length / 2),
    display.length - 1,
  ]);

  return (
    <Box mt="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5} mb={6}>
        30-day history
      </Text>
      <div className={styles.historyChart}>
        {display.map((rate, i) => {
          // 20%–80%; a rate that never changed (fixed tariff) sits mid-height.
          const heightPct =
            maxRate === minRate
              ? 50
              : ((rate.unitRateIncVat - minRate) / range) * 60 + 20;
          return (
            <div
              key={rate.date}
              className={`${styles.historyBar} ${rate.isCurrent ? styles.current : ''}`}
              style={{ height: `${heightPct}%` }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === i && (
                <div className={styles.tooltip}>
                  <Text size="xs" fw={700} ff="monospace">
                    {rate.unitRateIncVat.toFixed(4)}p
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(rate.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.historyLabels}>
        {display.map((rate, i) =>
          labelIndices.has(i) ? (
            <Text key={rate.date} size="xs" c="dimmed" ff="monospace">
              {new Date(rate.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          ) : null
        )}
      </div>
    </Box>
  );
}

// ─── Setup prompt ───

interface GasSetupProps {
  onSave: (code: string) => void;
}

function GasSetup({ onSave }: GasSetupProps) {
  const [value, setValue] = useState('');

  return (
    <Paper p="xl" radius="lg" withBorder className={styles.setupCard}>
      <Stack gap="md" align="center" ta="center">
        <div style={{ fontSize: 40 }}>🔥</div>
        <Box>
          <Text fw={600} size="lg">
            Set up Gas Tracker
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            Enter your Octopus gas product code to track your daily gas unit
            rate. Find it on your Octopus dashboard under{' '}
            <strong>Tariff</strong>.
          </Text>
        </Box>
        <Stack gap="xs" w="100%" maw={340}>
          <TextInput
            placeholder="e.g. SILVER-24-07-01"
            value={value}
            onChange={(e) =>
              setValue(e.currentTarget.value.trim().toUpperCase())
            }
            label="Gas product code"
            description="From your Octopus account → Tariff details"
            ff="monospace"
          />
          <Button
            color="orange"
            disabled={!value}
            onClick={() => onSave(value)}
            fullWidth
          >
            Track gas prices
          </Button>
        </Stack>
        <Text size="xs" c="dimmed">
          Common codes: SILVER-24-07-01, TRACKER-23-04-27
        </Text>
      </Stack>
    </Paper>
  );
}

// ─── Gas view ───

interface GasViewProps {
  currentRate: GasRate;
  tomorrowRate: GasRate | null;
  rates: GasRate[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
  standingCharge?: number | null;
}

function ChangeChip({
  rate,
  compareRate,
}: {
  rate: GasRate;
  compareRate: GasRate | null;
}) {
  if (!compareRate) return null;
  const pct =
    ((rate.unitRateIncVat - compareRate.unitRateIncVat) /
      compareRate.unitRateIncVat) *
    100;
  if (Math.abs(pct) < 0.01)
    return (
      <Badge color="gray" variant="light" size="xs">
        0%
      </Badge>
    );
  const up = pct > 0;
  return (
    <Badge
      color={up ? 'red' : 'green'}
      variant="light"
      size="xs"
      leftSection={
        up ? (
          <TrendUp size={10} weight="bold" />
        ) : (
          <TrendDown size={10} weight="bold" />
        )
      }
    >
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </Badge>
  );
}

function RateCard({
  rate,
  label,
  dimmed,
  compareRate,
}: {
  rate: GasRate | null;
  label: string;
  dimmed?: boolean;
  compareRate?: GasRate | null;
}) {
  return (
    <Paper
      p="md"
      radius="lg"
      withBorder
      className={dimmed ? styles.tomorrowCard : styles.currentCard}
    >
      <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts={0.5} mb={4}>
        {label}
      </Text>
      {rate ? (
        <>
          <Group gap={6} align="baseline" wrap="nowrap">
            <Text
              fw={800}
              size="xl"
              ff="monospace"
              lh={1.1}
              className={styles.rateValue}
              c={dimmed ? 'dimmed' : 'orange'}
            >
              {rate.unitRateIncVat.toFixed(2)}p
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mb={6}>
            per kWh
          </Text>
          {compareRate !== undefined && (
            <ChangeChip rate={rate} compareRate={compareRate ?? null} />
          )}
        </>
      ) : (
        <>
          <Text fw={600} size="sm" c="dimmed">
            Not yet
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            published
          </Text>
        </>
      )}
    </Paper>
  );
}

function GasView({
  currentRate,
  tomorrowRate,
  rates,
  lastUpdated,
  onRefresh,
  refreshing,
  standingCharge,
}: GasViewProps) {
  return (
    <Stack gap="md">
      {/* Header row with refresh */}
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--stat-orange)',
              background:
                'color-mix(in srgb, var(--stat-orange) 12%, transparent)',
              border:
                '1px solid color-mix(in srgb, var(--stat-orange) 40%, transparent)',
            }}
          >
            <Drop size={18} weight="fill" />
          </div>
          <Text fw={600}>Gas unit rates</Text>
        </Group>
        <Button
          variant="subtle"
          color="orange"
          size="xs"
          onClick={onRefresh}
          loading={refreshing}
          leftSection={<ArrowClockwise size={14} />}
        >
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
            : 'Refresh'}
        </Button>
      </Group>

      {/* Today + Tomorrow side by side */}
      <SimpleGrid cols={2} spacing="sm">
        <RateCard
          rate={currentRate}
          label="Today"
          compareRate={rates[1] ?? null}
        />
        <RateCard
          rate={tomorrowRate}
          label="Tomorrow"
          dimmed
          compareRate={currentRate}
        />
      </SimpleGrid>

      {standingCharge != null && (
        <Text size="xs" c="dimmed">
          Standing charge: {standingCharge.toFixed(2)}p/day (inc VAT)
        </Text>
      )}

      {/* History chart */}
      {rates.length > 1 && <GasHistoryChart rates={rates} />}
    </Stack>
  );
}

// ─── Main export ───

interface GasSectionProps {
  rates: GasRate[];
  currentRate: GasRate | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  gasProduct: string;
  onRefresh: () => void;
  onSetProduct: (code: string) => void;
  standingCharge?: number | null;
}

export function GasSection({
  rates,
  currentRate,
  loading,
  error,
  lastUpdated,
  gasProduct,
  onRefresh,
  onSetProduct,
  standingCharge,
}: GasSectionProps) {
  if (!gasProduct) {
    return <GasSetup onSave={onSetProduct} />;
  }

  if (loading) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Loader size="sm" color="orange" type="dots" />
        <Text size="sm" c="dimmed">
          Loading gas rates…
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack align="center" py="xl" gap="xs">
        <Text size="sm" c="red">
          {error}
        </Text>
        <Text size="xs" c="dimmed">
          Check your product code in Settings — it may have changed.
        </Text>
        <Button
          variant="light"
          color="orange"
          size="xs"
          onClick={onRefresh}
          mt="xs"
          leftSection={<ArrowClockwise size={14} />}
        >
          Retry
        </Button>
      </Stack>
    );
  }

  if (!currentRate) {
    return (
      <Stack align="center" py="xl" gap="xs">
        <Text size="sm" c="dimmed">
          No gas rate data found for this product code.
        </Text>
      </Stack>
    );
  }

  const tomorrowNoon = dayjs().add(1, 'day').hour(12).minute(0).toDate();
  const tomorrowRate = gasRateAt(rates, tomorrowNoon);

  return (
    <GasView
      currentRate={currentRate}
      tomorrowRate={tomorrowRate}
      rates={dailyGasRates(rates)}
      lastUpdated={lastUpdated}
      onRefresh={onRefresh}
      refreshing={loading}
      standingCharge={standingCharge}
    />
  );
}
