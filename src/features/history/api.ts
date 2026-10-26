import { toIsoDate, type LocalDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { toCategoryBreakdown, type CategoryBreakdownData } from './categories';
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

/** Rango de fechas locales `YYYY-MM-DD` (fin exclusivo) o `'all'` (todo el historial). */
export type CategoryRange = { from: string; to: string } | 'all';

/** Gasto por categoría de un rango o de todo el historial, ya ordenado, con el total de ese mismo conjunto. */
export async function fetchCategorySpending(range: CategoryRange): Promise<CategoryBreakdownData> {
  // 'all' = todo el historial: se llama sin argumentos (los parámetros de la RPC tienen default null).
  const { data, error } = await supabase.rpc('get_category_spending', range === 'all' ? {} : { p_from: range.from, p_to: range.to });
  if (error) throw error;
  return toCategoryBreakdown(data ?? []);
}

/** Total de todo el historial: fecha del primer gasto (`null` si no hay), suma y cantidad de gastos. */
export async function fetchSpendingOverall(): Promise<{ firstIso: string | null; totalDop: number; txCount: number }> {
  const { data, error } = await supabase.rpc('get_spending_overall');
  if (error) throw error;
  const row = data?.[0];
  return { firstIso: row?.first_date ?? null, totalDop: row?.total_dop ?? 0, txCount: row?.tx_count ?? 0 };
}
