import { useQuery } from '@tanstack/react-query';
import { fetchLatestUsdRate } from './api';
import { rateKeys } from './keys';

export function useLatestUsdRate() {
  return useQuery({ queryKey: rateKeys.latest(), queryFn: fetchLatestUsdRate, staleTime: 60 * 60_000 });
}
