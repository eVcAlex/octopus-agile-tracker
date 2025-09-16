import { useState, useEffect, useCallback } from "react";
import { octopusApi } from "../api/octopusApi";
import type { DailyPriceData } from "../types";
import { OctopusRegion } from "../types";

interface UsePricingState {
  todayData: DailyPriceData | null;
  tomorrowData: DailyPriceData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UsePricingReturn extends UsePricingState {
  refreshData: () => Promise<void>;
  setRegion: (region: OctopusRegion) => void;
  currentRegion: OctopusRegion;
}

export const usePricing = (initialRegion?: OctopusRegion): UsePricingReturn => {
  const [state, setState] = useState<UsePricingState>({
    todayData: null,
    tomorrowData: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const [currentRegion, setCurrentRegion] = useState<OctopusRegion>(
    initialRegion || octopusApi.getCurrentRegion()
  );

  const refreshData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { today, tomorrow } = await octopusApi.getTodayAndTomorrowRates();

      setState({
        todayData: today,
        tomorrowData: tomorrow,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const setRegion = useCallback(
    (region: OctopusRegion) => {
      setCurrentRegion(region);
      octopusApi.setRegion(region);
      refreshData();
    },
    [refreshData]
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const interval = setInterval(refreshData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    ...state,
    refreshData,
    setRegion,
    currentRegion,
  };
};
