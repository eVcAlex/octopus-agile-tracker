import { useState, useCallback } from 'react';
import { getStored, setStored } from '../../../lib/storage';
import { regionSchema, type Region } from '../schemas';
import { DEFAULT_ELECTRICITY_PRODUCT } from '../api/tariffs';

const STORAGE_KEY = 'agile-tracker-region';
const FORECAST_DAYS_KEY = 'agile-tracker-forecast-days';
const ELECTRICITY_PRODUCT_KEY = 'agile-tracker-electricity-product';
const GAS_PRODUCT_KEY = 'agile-tracker-gas-product';
const SHOW_GAS_KEY = 'agile-tracker-show-gas';
const API_KEY_STORAGE = 'agile-tracker-api-key';
const ACCOUNT_NO_STORAGE = 'agile-tracker-account-no';
const DEFAULT_FORECAST_DAYS = 7;

function loadRegion(): Region | null {
  const raw = getStored(STORAGE_KEY);
  return raw ? (regionSchema.safeParse(raw).data ?? null) : null;
}

function loadForecastDays(): number {
  const n = parseInt(getStored(FORECAST_DAYS_KEY) ?? '', 10);
  return n >= 1 && n <= 14 ? n : DEFAULT_FORECAST_DAYS;
}

export function useRegion() {
  const saved = loadRegion();
  const [region, setRegionState] = useState<Region>(
    saved ?? (null as unknown as Region)
  );
  const [forecastDays, setForecastDaysState] = useState(loadForecastDays);
  // Existing users predate this setting and were all on Agile.
  const [electricityProduct, setElectricityProductState] = useState(
    () => getStored(ELECTRICITY_PRODUCT_KEY) || DEFAULT_ELECTRICITY_PRODUCT
  );
  const [gasProduct, setGasProductState] = useState(
    () => getStored(GAS_PRODUCT_KEY) ?? ''
  );
  // Shown unless explicitly hidden, so existing users keep their Gas tab.
  const [showGas, setShowGasState] = useState(
    () => getStored(SHOW_GAS_KEY) !== 'false'
  );
  const [apiKey, setApiKeyState] = useState(
    () => getStored(API_KEY_STORAGE) ?? ''
  );
  const [accountNo, setAccountNoState] = useState(
    () => getStored(ACCOUNT_NO_STORAGE) ?? ''
  );

  const setRegion = useCallback((next: Region) => {
    setRegionState(next);
    setStored(STORAGE_KEY, next);
  }, []);
  const setForecastDays = useCallback((days: number) => {
    setForecastDaysState(days);
    setStored(FORECAST_DAYS_KEY, String(days));
  }, []);
  const setElectricityProduct = useCallback((code: string) => {
    const next = code.trim().toUpperCase() || DEFAULT_ELECTRICITY_PRODUCT;
    setElectricityProductState(next);
    setStored(ELECTRICITY_PRODUCT_KEY, next);
  }, []);
  const setGasProduct = useCallback((code: string) => {
    setGasProductState(code);
    setStored(GAS_PRODUCT_KEY, code);
  }, []);
  const setShowGas = useCallback((show: boolean) => {
    setShowGasState(show);
    setStored(SHOW_GAS_KEY, String(show));
  }, []);
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    setStored(API_KEY_STORAGE, key);
  }, []);
  const setAccountNo = useCallback((no: string) => {
    setAccountNoState(no);
    setStored(ACCOUNT_NO_STORAGE, no);
  }, []);

  return {
    region,
    setRegion,
    isFirstTime: saved === null,
    forecastDays,
    setForecastDays,
    electricityProduct,
    setElectricityProduct,
    gasProduct,
    setGasProduct,
    showGas,
    setShowGas,
    apiKey,
    setApiKey,
    accountNo,
    setAccountNo,
  };
}
