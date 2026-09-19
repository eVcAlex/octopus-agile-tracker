import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchForecast } from '../api/forecastApi';
import { errorMessage } from '../../../lib/errors';
import type { Region, ForecastData } from '../schemas';

export interface UseForecastReturn {
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

export function useForecast(
  region: Region,
  hasTomorrowRates: boolean,
  maxDays = 7,
  /** AgilePredict only forecasts Agile, so skip the fetch on other tariffs. */
  enabled = true
): UseForecastReturn {
  const qc = useQueryClient();

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['forecast', region] as const,
    queryFn: () => fetchForecast(region),
    refetchInterval: 30 * 60_000,
    enabled: !!region && enabled,
  });

  const forecast = useMemo<ForecastData | null>(() => {
    if (!data) return null;
    const minOffset = hasTomorrowRates ? 2 : 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = data.days.filter((day) => {
      const d = new Date(day.date + 'T00:00:00');
      return (
        Math.round((d.getTime() - today.getTime()) / 86_400_000) >= minOffset
      );
    });
    // Drop the last day, since the API often returns incomplete data for it
    const trimmed = filtered.length > 1 ? filtered.slice(0, -1) : filtered;
    return {
      ...data,
      days: trimmed.slice(0, maxDays),
    };
  }, [data, hasTomorrowRates, maxDays]);

  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ['forecast', region] }),
    [qc, region]
  );

  return {
    forecast,
    loading: isLoading,
    error: errorMessage(error),
    refresh,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
