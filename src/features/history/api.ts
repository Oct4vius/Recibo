import { toIsoDate, type LocalDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Granularity } from './granularity';
import { toHistoryBucket, type HistoryBucket } from './mapping';

/** Total por período (la RPC suma en SQL y devuelve los vacíos en cero), del más viejo al más nuevo. */
export async function fetchHistory(granularity: Granularity, first: LocalDate, last: LocalDate): Promise<HistoryBucket[]> {
  const { data, error } = await supabase.rpc('get_history', {
    p_granularity: granularity,
    p_from: toIsoDate(first),
    p_to: toIsoDate(last),
  });
  if (error) throw error;
  return (data ?? []).map(toHistoryBucket);
}
