import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGasRates } from '../api/gasApi';
import type { Region, GasRate } from '../schemas';

export interface UseGasReturn {
  rates: GasRate[];
  currentRate: GasRate | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useGas(region: Region, productCode: string): UseGasReturn {
  const qc = useQueryClient();

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['gas', region, productCode] as const,
    queryFn: () => fetchGasRates(region, productCode),
    refetchInterval: 60 * 60_000, // gas rates change at most daily
    enabled: !!region && !!productCode,
    staleTime: 5 * 60_000,
  });

  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ['gas', region, productCode] }),
    [qc, region, productCode],
  );

  const currentRate = data?.find((r) => r.isCurrent) ?? data?.[0] ?? null;

  return {
    rates: data ?? [],
    currentRate,
    loading: !!region && !!productCode && isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refresh,
  };
}
