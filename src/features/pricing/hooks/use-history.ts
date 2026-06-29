import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../api/octopusApi';
import { errorMessage } from '../../../lib/errors';
import type { Region } from '../schemas';

const SIX_HOURS = 6 * 60 * 60_000;

export function useHistory(region: Region) {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['history', region] as const,
    queryFn: () => fetchHistory(region),
    staleTime: SIX_HOURS,
    enabled: !!region,
  });

  return {
    history: data ?? [],
    loading: isLoading,
    error: errorMessage(error),
    refresh: refetch,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
