import { useQuery } from '@tanstack/react-query';
import { fetchWholesaleForUkDay, ukDayStart } from '../api/wholesaleApi';
import { fetchRates } from '../api/octopusApi';
import { DEFAULT_ELECTRICITY_PRODUCT } from '../api/tariffs';
import {
  estimateSlots,
  compareEstimateToConfirmed,
  type EstimateAccuracy,
} from '../agileFormula';
import type { Region } from '../schemas';

// Require most of the day matched before showing an accuracy claim.
const MIN_MATCHED_SLOTS = 40;

/**
 * How close yesterday's wholesale-derived estimate came to the rates Octopus
 * actually confirmed — recomputed from the settled auction, so no stored
 * estimate is needed. Shown as a trust signal next to today's estimate.
 */
export function useEstimateAccuracy(
  region: Region,
  enabled: boolean
): EstimateAccuracy | null {
  const yesterday = ukDayStart(-1);

  const { data } = useQuery({
    queryKey: [
      'estimate-accuracy',
      region,
      yesterday.format('YYYY-MM-DD'),
    ] as const,
    enabled: enabled && !!region,
    staleTime: Infinity, // a settled day never changes
    retry: 1,
    queryFn: async (): Promise<EstimateAccuracy> => {
      const [wholesale, confirmed] = await Promise.all([
        fetchWholesaleForUkDay(-1),
        // The formula is calibrated to this exact Agile version.
        fetchRates(
          region,
          DEFAULT_ELECTRICITY_PRODUCT,
          yesterday.toDate(),
          yesterday.add(1, 'day').toDate()
        ),
      ]);
      return compareEstimateToConfirmed(
        estimateSlots(wholesale, region),
        confirmed
      );
    },
  });

  return data && data.n >= MIN_MATCHED_SLOTS ? data : null;
}
