import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchTomorrowWholesale } from '../api/wholesaleApi';
import { estimateSlots } from '../agileFormula';
import { calcStats } from '../api/octopusApi';
import { errorMessage } from '../../../lib/errors';
import type { Region, DailyPrices } from '../schemas';

const ONE_HOUR = 60 * 60_000;

/**
 * Wholesale-derived estimate of tomorrow's Agile rates, shaped as DailyPrices
 * so it renders through the same components as confirmed rates. Only runs when
 * `enabled` (i.e. tomorrow's confirmed rates aren't published yet).
 */
export function useEstimate(region: Region, enabled: boolean) {
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  const { data, isLoading, error } = useQuery({
    queryKey: ['estimate', region, tomorrow] as const,
    enabled: enabled && !!region,
    staleTime: ONE_HOUR,
    queryFn: async (): Promise<DailyPrices> => {
      const wholesale = await fetchTomorrowWholesale();
      const rates = estimateSlots(wholesale, region);
      return { date: tomorrow, rates, stats: calcStats(rates) };
    },
  });

  return {
    estimate: data && data.rates.length > 0 ? data : null,
    loading: enabled && !!region && isLoading,
    error: errorMessage(error),
  };
}
