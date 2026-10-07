import { supabase } from '@/lib/supabase';
import { toActiveBudgets, type ActiveBudgets } from './active';

export async function fetchActiveBudgets(): Promise<ActiveBudgets> {
  const { data, error } = await supabase.from('budgets').select('period, limit_amount').eq('is_active', true);
  if (error) throw error;
  return toActiveBudgets(data);
}
