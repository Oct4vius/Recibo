import { useQuery } from '@tanstack/react-query';
import { useTimeZone } from '@/features/profile/hooks';
import { toIsoDate, toLocalDate } from '@/lib/dates';
import { fetchHistory } from './api';
import type { Granularity } from './granularity';
import { historyKeys } from './keys';
import { historyWindow } from './window';

export function useHistory(granularity: Granularity, offset: number) {
  const timeZone = useTimeZone();
  const window = historyWindow(granularity, offset, toLocalDate(new Date(), timeZone));
  const query = useQuery({
    queryKey: historyKeys.window(granularity, toIsoDate(window.first), timeZone),
    queryFn: () => fetchHistory(granularity, window.first, window.last),
  });
  return { window, query };
}
