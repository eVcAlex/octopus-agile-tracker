import { useState, useCallback } from 'react';
import { regionSchema, type Region } from '../schemas';

const STORAGE_KEY = 'agile-tracker-region';
const FORECAST_DAYS_KEY = 'agile-tracker-forecast-days';
const DEFAULT_FORECAST_DAYS = 7;

function loadRegion(): Region | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return regionSchema.parse(raw);
  } catch {
    return null;
  }
}

function saveRegion(region: Region) {
  try {
    localStorage.setItem(STORAGE_KEY, region);
  } catch {
    // Storage unavailable (private browsing, quota)
  }
}

function loadForecastDays(): number {
  try {
    const raw = localStorage.getItem(FORECAST_DAYS_KEY);
    if (!raw) return DEFAULT_FORECAST_DAYS;
    const n = parseInt(raw, 10);
    return n >= 1 && n <= 14 ? n : DEFAULT_FORECAST_DAYS;
  } catch {
    return DEFAULT_FORECAST_DAYS;
  }
}

function saveForecastDays(days: number) {
  try {
    localStorage.setItem(FORECAST_DAYS_KEY, String(days));
  } catch {
    // Storage unavailable
  }
}

export function useRegion() {
  const saved = loadRegion();
  const [region, setRegionState] = useState<Region>(saved ?? (null as unknown as Region));
  const [forecastDays, setForecastDaysState] = useState(loadForecastDays);

  const setRegion = useCallback((next: Region) => {
    setRegionState(next);
    saveRegion(next);
  }, []);

  const setForecastDays = useCallback((days: number) => {
    setForecastDaysState(days);
    saveForecastDays(days);
  }, []);

  return { region, setRegion, isFirstTime: saved === null, forecastDays, setForecastDays };
}
