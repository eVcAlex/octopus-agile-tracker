import { useQuery } from '@tanstack/react-query';
import { fetchElecStandingCharge } from '../api/octopusApi';
import { fetchGasStandingCharge } from '../api/gasApi';
import type { Region } from '../schemas';

const SIX_HOURS = 6 * 60 * 60_000;

export function useStandingCharges(region: Region, gasProduct: string) {
  const elec = useQuery({
    queryKey: ['standing-charge', 'elec', region] as const,
    queryFn: () => fetchElecStandingCharge(region),
    staleTime: SIX_HOURS,
    enabled: !!region,
  });

  const gas = useQuery({
    queryKey: ['standing-charge', 'gas', region, gasProduct] as const,
    queryFn: () => fetchGasStandingCharge(region, gasProduct),
    staleTime: SIX_HOURS,
    enabled: !!region && !!gasProduct,
  });

  return {
    elecStandingCharge: elec.data ?? null,
    gasStandingCharge: gas.data ?? null,
  };
}
