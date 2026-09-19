import { useEffect, useRef, useState } from 'react';
import {
  Drawer,
  Stack,
  Group,
  Divider,
  Text,
  Select,
  Switch,
  Button,
  TextInput,
} from '@mantine/core';
import {
  MapPin,
  CalendarBlank,
  Drop,
  MagicWand,
  Clock,
  Lightning,
  Bell,
  Key,
  Flame,
} from 'phosphor-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAccountDetails } from '../../api/accountApi';
import { fetchElectricityProducts } from '../../api/productsApi';
import { tariffName } from '../../api/tariffs';
import { sendTestNotification } from '../../../../lib/push';
import {
  REGIONS,
  REGION_LABELS,
  regionSchema,
  type Region,
} from '../../schemas';
import type { useNotifications } from '../../hooks/use-notifications';

const regionOptions = REGIONS.map((code) => ({
  value: code,
  label: REGION_LABELS[code],
}));

type Notifications = ReturnType<typeof useNotifications>;
type TestState = 'idle' | 'sending' | 'ok' | 'err';

function SectionHeader({
  icon: Icon,
  label,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  label: string;
}) {
  return (
    <Group gap={6}>
      <Icon size={14} weight="fill" color="var(--text-subtle)" />
      <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={0.8}>
        {label}
      </Text>
    </Group>
  );
}

interface SettingsDrawerProps {
  opened: boolean;
  onClose: () => void;
  region: Region;
  onSetRegion: (region: Region) => void;
  forecastDays: number;
  onSetForecastDays: (days: number) => void;
  electricityProduct: string;
  onSetElectricityProduct: (code: string) => void;
  /** Push alerts and forecasts are built on Agile rates only. */
  isAgile: boolean;
  gasProduct: string;
  onSetGasProduct: (code: string) => void;
  showGas: boolean;
  onSetShowGas: (show: boolean) => void;
  apiKey: string;
  onSetApiKey: (key: string) => void;
  accountNo: string;
  onSetAccountNo: (no: string) => void;
  notifications: Notifications;
}

export function SettingsDrawer({
  opened,
  onClose,
  region,
  onSetRegion,
  forecastDays,
  onSetForecastDays,
  electricityProduct,
  onSetElectricityProduct,
  isAgile,
  gasProduct,
  onSetGasProduct,
  showGas,
  onSetShowGas,
  apiKey,
  onSetApiKey,
  accountNo,
  onSetAccountNo,
  notifications,
}: SettingsDrawerProps) {
  const [gasProductDraft, setGasProductDraft] = useState(gasProduct);
  const [apiKeyDraft, setApiKeyDraft] = useState(apiKey);
  const [accountNoDraft, setAccountNoDraft] = useState(accountNo);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectSuccess, setDetectSuccess] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestState>('idle');
  const detectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const products = useQuery({
    queryKey: ['electricity-products'] as const,
    queryFn: fetchElectricityProducts,
    enabled: opened,
    staleTime: 24 * 60 * 60_000,
  });
  const tariffOptions = (products.data ?? []).map((p) => ({
    value: p.code,
    label: `${p.label} (${p.code})`,
  }));
  // The saved tariff may be withdrawn from sale and so missing from the list.
  if (!tariffOptions.some((o) => o.value === electricityProduct)) {
    tariffOptions.unshift({
      value: electricityProduct,
      label: `${tariffName(electricityProduct)} (${electricityProduct})`,
    });
  }

  // Re-sync drafts from the committed values whenever the drawer reopens.
  useEffect(() => {
    if (opened) {
      setGasProductDraft(gasProduct);
      setApiKeyDraft(apiKey);
      setAccountNoDraft(accountNo);
      setDetectError(null);
      setDetectSuccess(null);
    }
  }, [opened, gasProduct, apiKey, accountNo]);

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
      onSetApiKey(apiKeyDraft.trim());
      onSetAccountNo(accountNoDraft.trim().toUpperCase());

      const found: string[] = [];
      const notes: string[] = [];

      if (details.electricityRegisters === 2) {
        notes.push(
          "Your electricity tariff has separate day/night rates (e.g. Economy 7), which isn't supported yet."
        );
      } else if (details.electricityProductCode) {
        onSetElectricityProduct(details.electricityProductCode);
        found.push(
          `Electricity: ${tariffName(details.electricityProductCode)}`
        );
        // The tariff code carries the region, so keep the two in agreement.
        const detectedRegion = regionSchema.safeParse(
          details.electricityRegion
        );
        if (detectedRegion.success && detectedRegion.data !== region) {
          onSetRegion(detectedRegion.data);
        }
      } else {
        notes.push('No active electricity tariff found on this account.');
      }

      if (details.gasProductCode) {
        onSetGasProduct(details.gasProductCode);
        setGasProductDraft(details.gasProductCode);
        onSetShowGas(true);
        found.push(`Gas: ${details.gasProductCode}`);
      } else {
        onSetShowGas(false);
        notes.push('No active gas tariff found — Gas tab hidden.');
      }

      setDetectSuccess(found.length ? found.join(' · ') : null);
      setDetectError(notes.length ? notes.join(' ') : null);
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

  async function handleTestNotification() {
    setTestState('sending');
    try {
      await sendTestNotification();
      setTestState('ok');
    } catch {
      setTestState('err');
    } finally {
      setTimeout(() => setTestState('idle'), 4000);
    }
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Settings"
      position="right"
      size="sm"
    >
      <Stack gap="lg" pt="xs">
        {/* Account auto-detect */}
        <Stack gap="xs">
          <SectionHeader icon={Key} label="Octopus Account" />
          <Text size="xs" c="dimmed">
            Enter your API key and account number to fill in your region,
            electricity tariff and gas below. Find them at{' '}
            <strong>octopus.energy → Account</strong>.
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
            Your API key and account number are stored only in this browser and
            sent only to the Octopus Energy API.
          </Text>
          {(apiKey || accountNo) && (
            <Button
              variant="subtle"
              color="red"
              size="xs"
              onClick={() => {
                onSetApiKey('');
                onSetAccountNo('');
                setApiKeyDraft('');
                setAccountNoDraft('');
              }}
            >
              Clear stored credentials
            </Button>
          )}
        </Stack>

        <Divider />

        {/* Electricity */}
        <Stack gap="xs">
          <SectionHeader icon={Lightning} label="Electricity" />
          <Select
            label="Region"
            description="Your electricity network region"
            value={region}
            onChange={(val) => {
              if (val) onSetRegion(val as Region);
            }}
            data={regionOptions}
            leftSection={<MapPin size={16} />}
          />
          <Select
            label="Tariff"
            description={
              products.isError
                ? "Couldn't load the tariff list — showing your saved tariff"
                : 'Auto-detected from your account, or pick one'
            }
            value={electricityProduct}
            onChange={(val) => {
              if (val) onSetElectricityProduct(val);
            }}
            data={tariffOptions}
            searchable
            allowDeselect={false}
            nothingFoundMessage="No matching tariff"
            leftSection={<Lightning size={16} />}
          />
          {isAgile && (
            <Select
              label="Forecast days"
              description="Days of predictions to show"
              value={String(forecastDays)}
              onChange={(val) => {
                if (val) onSetForecastDays(parseInt(val, 10));
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
          )}
        </Stack>

        <Divider />

        {/* Gas */}
        <Stack gap="xs">
          <SectionHeader icon={Flame} label="Gas" />
          <Switch
            label="Show gas"
            description="Turn off if you don't have gas with Octopus"
            color="orange"
            checked={showGas}
            onChange={(e) => onSetShowGas(e.currentTarget.checked)}
          />
          {showGas && (
            <>
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
                  onClick={() => onSetGasProduct(gasProductDraft)}
                >
                  Save gas product code
                </Button>
              )}
            </>
          )}
        </Stack>

        <Divider />

        {/* Notifications */}
        <Stack gap="xs">
          <SectionHeader icon={Bell} label="Notifications" />
          {!isAgile ? (
            <Text size="xs" c="dimmed">
              Push alerts are built on Agile's half-hourly prices, so they're
              only available on the Agile tariff.
            </Text>
          ) : !notifications.supported ? (
            <Text size="xs" c="dimmed">
              Push notifications aren't supported in this browser. On iOS, add
              the app to your home screen first.
            </Text>
          ) : (
            <>
              <Switch
                label="Enable push notifications"
                description="Alerts even when the app is closed"
                color="violet"
                checked={notifications.enabled}
                disabled={notifications.busy}
                onChange={(e) =>
                  notifications.setEnabled(e.currentTarget.checked)
                }
              />
              {notifications.enabled && (
                <>
                  <Switch
                    label="Tomorrow's rates published"
                    description="Daily summary when prices land (~4pm)"
                    size="xs"
                    color="violet"
                    checked={notifications.prefs.ratesPublished}
                    disabled={notifications.busy}
                    onChange={(e) =>
                      notifications.updatePref(
                        'ratesPublished',
                        e.currentTarget.checked
                      )
                    }
                  />
                  <Switch
                    label="Plunge pricing"
                    description="When prices go negative"
                    size="xs"
                    color="violet"
                    checked={notifications.prefs.plunge}
                    disabled={notifications.busy}
                    onChange={(e) =>
                      notifications.updatePref(
                        'plunge',
                        e.currentTarget.checked
                      )
                    }
                  />
                  <Switch
                    label="Cheap window starting soon"
                    description="Heads-up before today's cheapest run"
                    size="xs"
                    color="violet"
                    checked={notifications.prefs.cheapWindow}
                    disabled={notifications.busy}
                    onChange={(e) =>
                      notifications.updatePref(
                        'cheapWindow',
                        e.currentTarget.checked
                      )
                    }
                  />
                  {notifications.prefs.cheapWindow && (
                    <Select
                      label="Window length"
                      description="How long you need cheap power for"
                      value={String(notifications.prefs.cheapWindowHours)}
                      disabled={notifications.busy}
                      onChange={(val) => {
                        if (val)
                          notifications.updatePref(
                            'cheapWindowHours',
                            parseInt(val, 10) as 1 | 2 | 3 | 4
                          );
                      }}
                      data={[
                        { value: '1', label: '1 hour' },
                        { value: '2', label: '2 hours' },
                        { value: '3', label: '3 hours' },
                        { value: '4', label: '4 hours' },
                      ]}
                      leftSection={<Clock size={16} />}
                    />
                  )}
                </>
              )}
              {notifications.error && (
                <Text size="xs" c="red">
                  {notifications.error}
                </Text>
              )}
              {notifications.enabled && (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    color="violet"
                    loading={testState === 'sending'}
                    onClick={handleTestNotification}
                  >
                    Send test notification
                  </Button>
                  {testState === 'ok' && (
                    <Text size="xs" c="green">
                      ✓ Sent — check your notifications
                    </Text>
                  )}
                  {testState === 'err' && (
                    <Text size="xs" c="red">
                      Failed to send — check the console
                    </Text>
                  )}
                </>
              )}
            </>
          )}
        </Stack>
      </Stack>
    </Drawer>
  );
}
