import { supabase } from '@/lib/supabase';
import type { BudgetPeriod } from '@/types/database';
import { toSpendingSummary, type SpendingSummary } from './mapping';

/** Totales del período actual y del anterior, en DOP, calculados por la RPC (nunca en el cliente). */
export async function fetchSpendingSummary(period: BudgetPeriod): Promise<SpendingSummary> {
  const { data, error } = await supabase.rpc('get_spending_summary', { p_period: period });
  if (error) throw error;
  return toSpendingSummary(data?.[0]);
}
