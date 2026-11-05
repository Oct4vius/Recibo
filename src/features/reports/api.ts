import { fetchCategorySpending, fetchHistory } from '@/features/history/api';
import { localDate, toIsoDate, type LocalDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { toMonthReport, toReportItem } from './mapping';
import type { MonthReport, YearReport } from './types';

/** Hoja del mes que empieza en `monthStart`: gastos agrupados por categoría, con totales de SQL. */
export async function fetchMonthReport(monthStart: LocalDate): Promise<MonthReport> {
  const { data, error } = await supabase.rpc('get_month_report', { p_month: toIsoDate(monthStart) });
  if (error) throw error;
  return toMonthReport(data ?? []);
}

/** Hoja del año: `lastMonth` es el día 1 del último mes mostrado (lo calcula quien llama). */
export async function fetchYearReport(year: number, lastMonth: LocalDate): Promise<YearReport> {
  const from = toIsoDate(localDate(year, 1, 1));
  const to = toIsoDate(localDate(year + 1, 1, 1));
  const [categories, months, largest] = await Promise.all([
    fetchCategorySpending({ from, to }),
    fetchHistory('month', localDate(year, 1, 1), lastMonth),
    supabase.rpc('get_largest_uncategorized', { p_from: from, p_to: to }),
  ]);
  if (largest.error) throw largest.error;
  return {
    categories,
    largestUncategorized: (largest.data ?? []).map(toReportItem),
    months,
    totalDop: categories.total,
    count: categories.items.reduce((sum, c) => sum + c.txCount, 0),
  };
}
