import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDailyRates } from '../api/octopusApi';
import type { Region, DailyPrices } from '../schemas';
import { useRegion } from './use-region';

export interface UsePricingReturn {
  todayData: DailyPrices | null;
  tomorrowData: DailyPrices | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  setRegion: (region: Region) => void;
  currentRegion: Region;
  needsRegion: boolean;
  forecastDays: number;
  setForecastDays: (days: number) => void;
  gasProduct: string;
  setGasProduct: (code: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  accountNo: string;
  setAccountNo: (no: string) => void;
}

export function usePricing(): UsePricingReturn {
  const { region, setRegion: persistRegion, isFirstTime, forecastDays, setForecastDays, gasProduct, setGasProduct, apiKey, setApiKey, accountNo, setAccountNo } = useRegion();
  const qc = useQueryClient();

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['pricing', region] as const,
    queryFn: () => fetchDailyRates(region),
    refetchInterval: 30 * 60_000,
    enabled: !!region,
  });

  const refreshData = useCallback(
    () => qc.invalidateQueries({ queryKey: ['pricing', region] }),
    [qc, region],
  );

  return {
    todayData: data?.today ?? null,
    tomorrowData: data?.tomorrow ?? null,
    loading: !!region && isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refreshData,
    setRegion: persistRegion,
    currentRegion: region,
    needsRegion: isFirstTime,
    forecastDays,
    setForecastDays,
    gasProduct,
    setGasProduct,
    apiKey,
    setApiKey,
    accountNo,
    setAccountNo,
  };
}
