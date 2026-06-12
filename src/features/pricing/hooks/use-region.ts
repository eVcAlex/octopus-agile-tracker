import { useState, useCallback } from 'react';
import { regionSchema, type Region } from '../schemas';

const STORAGE_KEY = 'agile-tracker-region';
const FORECAST_DAYS_KEY = 'agile-tracker-forecast-days';
const GAS_PRODUCT_KEY = 'agile-tracker-gas-product';
const API_KEY_STORAGE = 'agile-tracker-api-key';
const ACCOUNT_NO_STORAGE = 'agile-tracker-account-no';
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

function loadGasProduct(): string {
  try {
    return localStorage.getItem(GAS_PRODUCT_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveGasProduct(code: string) {
  try {
    localStorage.setItem(GAS_PRODUCT_KEY, code);
  } catch {
    /* noop */
  }
}

function load(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function save(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* noop */
  }
}

export function useRegion() {
  const saved = loadRegion();
  const [region, setRegionState] = useState<Region>(
    saved ?? (null as unknown as Region)
  );
  const [forecastDays, setForecastDaysState] = useState(loadForecastDays);
  const [gasProduct, setGasProductState] = useState(loadGasProduct);
  const [apiKey, setApiKeyState] = useState(() => load(API_KEY_STORAGE));
  const [accountNo, setAccountNoState] = useState(() =>
    load(ACCOUNT_NO_STORAGE)
  );

  const setRegion = useCallback((next: Region) => {
    setRegionState(next);
    saveRegion(next);
  }, []);
  const setForecastDays = useCallback((days: number) => {
    setForecastDaysState(days);
    saveForecastDays(days);
  }, []);
  const setGasProduct = useCallback((code: string) => {
    setGasProductState(code);
    saveGasProduct(code);
  }, []);
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    save(API_KEY_STORAGE, key);
  }, []);
  const setAccountNo = useCallback((no: string) => {
    setAccountNoState(no);
    save(ACCOUNT_NO_STORAGE, no);
  }, []);

  return {
    region,
    setRegion,
    isFirstTime: saved === null,
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
