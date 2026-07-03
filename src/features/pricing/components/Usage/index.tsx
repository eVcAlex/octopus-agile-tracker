import { useState } from 'react';
import {
  Box,
  Text,
  Stack,
  Paper,
  Loader,
  Button,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import { GearSix, Wallet } from 'phosphor-react';
import type { SpendSummary } from '../../api/consumptionApi';
import type { TariffCost } from '../../api/tariffComparisonApi';
import styles from './Usage.module.scss';

function pounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function fmtDay(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function SpendChart({ spend }: { spend: SpendSummary }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const days = spend.days;
  const maxCost = Math.max(...days.map((d) => d.agileCost), 1);

  const labelIndices = new Set([
    0,
    Math.floor(days.length / 2),
    days.length - 1,
  ]);

  return (
    <Box>
      <div className={styles.chart}>
        {days.map((day, i) => (
          <div
            key={day.date}
            className={styles.bar}
            style={{
              height: `${Math.max((day.agileCost / maxCost) * 95, 3)}%`,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === i && (
              <div className={styles.tooltip}>
                <Text size="xs" fw={600}>
                  {fmtDay(day.date)}
                </Text>
                <Text size="xs" ff="monospace">
                  {pounds(day.agileCost)} · {day.kwh.toFixed(1)} kWh
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  flat: {pounds(day.flatCost)}
                </Text>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.labels}>
        {days.map((day, i) =>
          labelIndices.has(i) ? (
            <Text key={day.date} size="xs" c="dimmed" ff="monospace">
              {fmtDay(day.date)}
            </Text>
          ) : null
        )}
      </div>
    </Box>
  );
}

function Summary({
  spend,
  flexibleRate,
}: {
  spend: SpendSummary;
  flexibleRate: number | null;
}) {
  const saving = spend.totalFlatCost - spend.totalAgileCost;
  const savingPct = spend.totalFlatCost
    ? (saving / spend.totalFlatCost) * 100
    : 0;

  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
        <Paper p="md" radius="md" className={styles.summaryCard}>
          <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts={0.5}>
            Agile spend · 30d
          </Text>
          <Text fw={700} size="lg" ff="monospace" lh={1.2}>
            {pounds(spend.totalAgileCost)}
          </Text>
          <Text size="xs" c="dimmed">
            {spend.totalKwh.toFixed(0)} kWh
          </Text>
        </Paper>
        <Paper p="md" radius="md" className={styles.summaryCard}>
          <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts={0.5}>
            On Flexible
          </Text>
          <Text fw={700} size="lg" ff="monospace" lh={1.2}>
            {flexibleRate != null ? pounds(spend.totalFlatCost) : '—'}
          </Text>
          <Text size="xs" c="dimmed">
            {flexibleRate != null
              ? `at ${flexibleRate.toFixed(2)}p/kWh`
              : 'rate unavailable'}
          </Text>
        </Paper>
        <Paper p="md" radius="md" className={styles.summaryCard}>
          <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts={0.5}>
            Agile saving you
          </Text>
          <Text
            fw={700}
            size="lg"
            ff="monospace"
            lh={1.2}
            c={saving >= 0 ? 'teal' : 'red'}
          >
            {flexibleRate != null
              ? `${saving >= 0 ? '' : '-'}${pounds(Math.abs(saving))}`
              : '—'}
          </Text>
          {flexibleRate != null && (
            <Badge
              color={saving >= 0 ? 'teal' : 'red'}
              variant="light"
              size="xs"
              mt={2}
            >
              {saving >= 0 ? '' : '-'}
              {Math.abs(savingPct).toFixed(0)}% vs flat
            </Badge>
          )}
        </Paper>
      </SimpleGrid>
      <Text size="xs" c="dimmed">
        Unit-rate comparison only — standing charges are similar on both tariffs
        and excluded.
      </Text>
    </Stack>
  );
}

function TariffComparison({ comparison }: { comparison: TariffCost[] }) {
  const agile = comparison.find((t) => t.key === 'agile');
  const cheapest = comparison[0];

  return (
    <Box>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5} mb={6}>
        Same usage on other tariffs · 30d
      </Text>
      <Paper p="md" radius="md" className={styles.summaryCard}>
        <Stack gap={8}>
          {comparison.map((t) => {
            const delta = agile ? t.totalCost - agile.totalCost : 0;
            return (
              <Box key={t.key} className={styles.compareRow}>
                <Text size="sm" fw={t.key === 'agile' ? 700 : 500}>
                  {t.label}
                  {t.key === cheapest.key && (
                    <Badge color="teal" variant="light" size="xs" ml={8}>
                      cheapest
                    </Badge>
                  )}
                </Text>
                <Text size="sm" fw={700} ff="monospace" ta="right">
                  {pounds(t.totalCost)}
                  {agile && t.key !== 'agile' && (
                    <Text
                      span
                      size="xs"
                      fw={600}
                      c={delta >= 0 ? 'red' : 'teal'}
                      ml={8}
                    >
                      {delta >= 0 ? '+' : '−'}
                      {pounds(Math.abs(delta))}
                    </Text>
                  )}
                </Text>
              </Box>
            );
          })}
          <Text size="xs" c="dimmed">
            Your actual half-hourly usage priced on each tariff, including its
            standing charge. Fixed tariffs (e.g. Go) use their current rates
            applied retrospectively.
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
}

interface UsageSectionProps {
  spend: SpendSummary | null;
  flexibleRate: number | null;
  comparison: TariffCost[] | null;
  loading: boolean;
  error: string | null;
  needsCredentials: boolean;
  noData: boolean;
  onOpenSettings: () => void;
}

export function UsageSection({
  spend,
  flexibleRate,
  comparison,
  loading,
  error,
  needsCredentials,
  noData,
  onOpenSettings,
}: UsageSectionProps) {
  if (needsCredentials) {
    return (
      <Paper p="xl" radius="lg" className={styles.setupCard}>
        <Stack gap="md" align="center" ta="center">
          <Wallet size={40} weight="duotone" />
          <Box>
            <Text fw={600} size="lg">
              See your actual spend
            </Text>
            <Text size="sm" c="dimmed" mt={4} maw={420}>
              Connect your Octopus account to see what your real usage costs on
              Agile — and whether it beats the flat Flexible tariff.
            </Text>
          </Box>
          <Button
            color="violet"
            leftSection={<GearSix size={16} />}
            onClick={onOpenSettings}
          >
            Add credentials in Settings
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Loader size="sm" color="violet" type="dots" />
        <Text size="sm" c="dimmed">
          Crunching your smart meter data…
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
          Check your API key and account number in Settings.
        </Text>
      </Stack>
    );
  }

  if (noData || !spend) {
    return (
      <Stack align="center" py="xl" gap="xs">
        <Text fw={600}>No smart meter data found</Text>
        <Text size="sm" c="dimmed" ta="center" maw={420}>
          Your account connected fine, but no half-hourly consumption came back.
          Smart meter data usually appears 1–2 days behind.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Summary spend={spend} flexibleRate={flexibleRate} />
      <Box>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5} mb={6}>
          Daily cost on Agile
        </Text>
        <SpendChart spend={spend} />
      </Box>
      {comparison && comparison.length > 1 && (
        <TariffComparison comparison={comparison} />
      )}
    </Stack>
  );
}
