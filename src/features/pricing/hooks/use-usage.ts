import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchAccountDetails } from '../api/accountApi';
import {
  fetchConsumption,
  fetchFlexibleRate,
  calcSpend,
  type SpendSummary,
} from '../api/consumptionApi';
import { fetchRates } from '../api/octopusApi';
import { errorMessage } from '../../../lib/errors';
import type { Region } from '../schemas';

const SIX_HOURS = 6 * 60 * 60_000;
const USAGE_DAYS = 30;

export interface UseUsageReturn {
  spend: SpendSummary | null;
  flexibleRate: number | null;
  loading: boolean;
  error: string | null;
  /** Credentials are missing — show setup prompt instead of data */
  needsCredentials: boolean;
  /** Credentials present but no smart-meter data came back */
  noData: boolean;
}

export function useUsage(
  region: Region,
  apiKey: string,
  accountNo: string
): UseUsageReturn {
  const enabled = !!region && !!apiKey && !!accountNo;

  const { data, isLoading, error } = useQuery({
    queryKey: ['usage', region, accountNo] as const,
    enabled,
    staleTime: SIX_HOURS,
    retry: 1,
    queryFn: async () => {
      const account = await fetchAccountDetails(apiKey, accountNo);
      if (!account.electricityMpan || !account.electricityMeterSerial) {
        return { spend: null, flexibleRate: null };
      }

      const to = dayjs().startOf('day').toDate();
      const from = dayjs().subtract(USAGE_DAYS, 'day').startOf('day').toDate();

      const [consumption, rates, flexibleRate] = await Promise.all([
        fetchConsumption(
          apiKey,
          account.electricityMpan,
          account.electricityMeterSerial,
          from,
          to
        ),
        fetchRates(region, from, to),
        fetchFlexibleRate(region),
      ]);

      if (!consumption.length) return { spend: null, flexibleRate };

      return {
        spend: calcSpend(consumption, rates, flexibleRate ?? 0),
        flexibleRate,
      };
    },
  });

  return {
    spend: data?.spend ?? null,
    flexibleRate: data?.flexibleRate ?? null,
    loading: enabled && isLoading,
    error: errorMessage(error),
    needsCredentials: !apiKey || !accountNo,
    noData: enabled && !isLoading && !error && !data?.spend,
  };
}
