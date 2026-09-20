import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchAccountDetails } from '../api/accountApi';
import {
  fetchConsumption,
  fetchFlexibleRate,
  calcSpend,
  type SpendSummary,
} from '../api/consumptionApi';
import { fetchRates, fetchElecStandingCharge } from '../api/octopusApi';
import {
  fetchTariffComparison,
  type TariffCost,
} from '../api/tariffComparisonApi';
import { tariffKey, tariffName } from '../api/tariffs';
import { errorMessage } from '../../../lib/errors';
import type { Region } from '../schemas';

const SIX_HOURS = 6 * 60 * 60_000;
const USAGE_DAYS = 30;

export interface UseUsageReturn {
  /** Short name of the tariff the spend is priced on, e.g. "Agile". */
  tariffName: string;
  /** The user is on Flexible, so a "vs Flexible" comparison is meaningless. */
  isFlexible: boolean;
  spend: SpendSummary | null;
  flexibleRate: number | null;
  /** What the same usage would cost per tariff (incl. standing charges). */
  comparison: TariffCost[] | null;
  loading: boolean;
  error: string | null;
  /** Credentials are missing: show setup prompt instead of data */
  needsCredentials: boolean;
  /** Credentials present but no smart-meter data came back */
  noData: boolean;
}

export function useUsage(
  region: Region,
  product: string,
  apiKey: string,
  accountNo: string
): UseUsageReturn {
  const enabled = !!region && !!apiKey && !!accountNo;
  const name = tariffName(product);
  const key = tariffKey(product);

  const { data, isLoading, error } = useQuery({
    queryKey: ['usage', region, product, accountNo] as const,
    enabled,
    staleTime: SIX_HOURS,
    retry: 1,
    queryFn: async () => {
      const account = await fetchAccountDetails(apiKey, accountNo);
      if (!account.electricityMpan || !account.electricityMeterSerial) {
        return { spend: null, flexibleRate: null, comparison: null };
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
        fetchRates(region, product, from, to),
        fetchFlexibleRate(region),
      ]);

      if (!consumption.length)
        return { spend: null, flexibleRate, comparison: null };

      const spend = calcSpend(consumption, rates, flexibleRate ?? 0);

      // Best-effort tariff comparison. The spend view works without it.
      let comparison: TariffCost[] | null = null;
      try {
        const days = spend.days.length;
        const [others, ownSc] = await Promise.all([
          fetchTariffComparison(region, consumption, from, to, days),
          fetchElecStandingCharge(region, product),
        ]);
        const ownStanding = (ownSc ?? 0) * days;
        comparison = [
          {
            key: 'current',
            label: `${name} (you)`,
            unitCost: spend.totalCost,
            standingCharge: ownStanding,
            totalCost: spend.totalCost + ownStanding,
          },
          // Don't list the user's own tariff twice.
          ...others.filter((o) => o.key !== key),
        ].sort((a, b) => a.totalCost - b.totalCost);
      } catch {
        comparison = null;
      }

      return { spend, flexibleRate, comparison };
    },
  });

  return {
    tariffName: name,
    isFlexible: key === 'flexible',
    spend: data?.spend ?? null,
    flexibleRate: data?.flexibleRate ?? null,
    comparison: data?.comparison ?? null,
    loading: enabled && isLoading,
    error: errorMessage(error),
    needsCredentials: !apiKey || !accountNo,
    noData: enabled && !isLoading && !error && !data?.spend,
  };
}
