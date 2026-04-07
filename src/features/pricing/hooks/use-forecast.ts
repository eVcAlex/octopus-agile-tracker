import { useState, useEffect, useCallback } from 'react';
import { fetchForecast } from '../api/forecastApi';
import type { ForecastData } from '../api/forecastApi';
import type { OctopusRegion } from '../types';

interface UseForecastReturn {
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

export const useForecast = (region: OctopusRegion): UseForecastReturn => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchForecast(region);
      setForecast(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  return { forecast, loading, error, refresh: load, lastUpdated };
};
