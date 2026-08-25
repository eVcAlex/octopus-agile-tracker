import { usePricing } from './use-pricing';
import { useEstimate } from './use-estimate';
import { useEstimateAccuracy } from './use-estimate-accuracy';
import { useForecast } from './use-forecast';
import { useGas } from './use-gas';
import { useStandingCharges } from './use-standing-charges';
import { useHistory } from './use-history';
import { useUsage, type UseUsageReturn } from './use-usage';
import { useNotifications } from './use-notifications';
import {
  tomorrowForecastAsDailyPrices,
  withoutTomorrow,
} from '../api/forecastApi';
import type { DailyAverage } from '../api/octopusApi';
import type { EstimateAccuracy } from '../agileFormula';
import {
  REGION_LABELS,
  type Region,
  type DailyPrices,
  type ForecastData,
  type GasRate,
} from '../schemas';

export type Notifications = ReturnType<typeof useNotifications>;

export interface DashboardSettings {
  region: Region;
  onSetRegion: (region: Region) => void;
  forecastDays: number;
  onSetForecastDays: (days: number) => void;
  gasProduct: string;
  onSetGasProduct: (code: string) => void;
  apiKey: string;
  onSetApiKey: (key: string) => void;
  accountNo: string;
  onSetAccountNo: (no: string) => void;
  notifications: Notifications;
}

export interface DashboardElectricity {
  todayData: DailyPrices | null;
  tomorrowData: DailyPrices | null;
  /** Octopus has published tomorrow's confirmed rates (~4pm). */
  hasTomorrow: boolean;
  /** Wholesale-derived estimate; only fetched when !hasTomorrow. */
  estimate: DailyPrices | null;
  /** Trust signal for `estimate`; null until enough slots matched. */
  estimateAccuracy: EstimateAccuracy | null;
  /** Pre-auction fallback (AgilePredict), only when !hasTomorrow && !estimate. */
  tomorrowForecast: DailyPrices | null;
  standingCharge: number | null;
  error: string | null;
}

export interface DashboardForecast {
  /** Already `withoutTomorrow()`-filtered — the tab starts at +2 days. */
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  /** Display label, not the region code. */
  region: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export interface DashboardGas {
  rates: GasRate[];
  currentRate: GasRate | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  gasProduct: string;
  onRefresh: () => void;
  onSetProduct: (code: string) => void;
  standingCharge: number | null;
}

export interface DashboardTrends {
  history: DailyAverage[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export interface UsePricingDashboardReturn {
  needsRegion: boolean;
  initialLoading: boolean;
  lastUpdated: Date | null;
  settings: DashboardSettings;
  electricity: DashboardElectricity;
  forecast: DashboardForecast;
  gas: DashboardGas;
  trends: DashboardTrends;
  usage: UseUsageReturn;
}

export function usePricingDashboard(): UsePricingDashboardReturn {
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
    forecast: rawForecast,
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
    refresh: refetchHistory,
  } = useHistory(currentRegion);

  const usage = useUsage(currentRegion, apiKey, accountNo);
  const notifications = useNotifications(currentRegion);

  // Pre-auction fallback: before the day-ahead auction clears (~midday) there
  // is no wholesale estimate, so show AgilePredict's ML forecast instead. Must
  // read the RAW forecast — `withoutTomorrow` filters out the exact date this
  // looks for, so reusing the filtered value here would make it always null.
  const tomorrowForecast =
    !hasTomorrow && !estimate.estimate
      ? tomorrowForecastAsDailyPrices(rawForecast)
      : null;

  return {
    needsRegion,
    initialLoading: loading && !todayData && !tomorrowData,
    lastUpdated,
    settings: {
      region: currentRegion,
      onSetRegion: setRegion,
      forecastDays,
      onSetForecastDays: setForecastDays,
      gasProduct,
      onSetGasProduct: setGasProduct,
      apiKey,
      onSetApiKey: setApiKey,
      accountNo,
      onSetAccountNo: setAccountNo,
      notifications,
    },
    electricity: {
      todayData,
      tomorrowData,
      hasTomorrow,
      estimate: estimate.estimate,
      estimateAccuracy,
      tomorrowForecast,
      standingCharge: elecStandingCharge,
      error,
    },
    forecast: {
      forecast: withoutTomorrow(rawForecast),
      loading: forecastLoading,
      error: forecastError,
      region: REGION_LABELS[currentRegion] ?? currentRegion,
      lastUpdated: forecastUpdated,
      onRefresh: refreshForecast,
    },
    gas: {
      rates: gasRates,
      currentRate: gasCurrentRate,
      loading: gasLoading,
      error: gasError,
      lastUpdated: gasUpdated,
      gasProduct,
      onRefresh: refreshGas,
      onSetProduct: setGasProduct,
      standingCharge: gasStandingCharge,
    },
    trends: {
      history,
      loading: historyLoading,
      error: historyError,
      onRefresh: () => {
        void refetchHistory();
      },
    },
    usage,
  };
}
