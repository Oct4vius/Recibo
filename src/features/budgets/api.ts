import { supabase } from '@/lib/supabase';
import type { BudgetPeriod } from '@/types/database';
import { toActiveBudgets, type ActiveBudgets } from './active';

export async function fetchActiveBudgets(): Promise<ActiveBudgets> {
  const { data, error } = await supabase.from('budgets').select('period, limit_amount').eq('is_active', true);
  if (error) throw error;
  return toActiveBudgets(data);
}

/** Upsert sobre `unique (user_id, period)`: un segundo insert fallaría con 23505. Reactiva uno quitado. */
export async function saveBudget(userId: string, period: BudgetPeriod, limitCents: number): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .upsert({ user_id: userId, period, limit_amount: limitCents / 100, is_active: true }, { onConflict: 'user_id,period' });
  if (error) throw error;
}

/** Quitar = desactivar (se conserva el historial de avisos enviados). */
export async function removeBudget(period: BudgetPeriod): Promise<void> {
  const { error } = await supabase.from('budgets').update({ is_active: false }).eq('period', period);
  if (error) throw error;
}
