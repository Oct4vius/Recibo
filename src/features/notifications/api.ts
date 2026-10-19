import { supabase } from '@/lib/supabase';
import { toClaimedAlerts, type ClaimedAlert } from './mapping';

/** Reclama en el servidor los umbrales recién cruzados; solo devuelve lo que esta llamada reclamó. */
export async function claimBudgetAlerts(): Promise<ClaimedAlert[]> {
  const { data, error } = await supabase.rpc('claim_budget_alerts');
  if (error) throw error;
  return toClaimedAlerts(data);
}

/** Da por avisado lo que el período actual ya cruzó. */
export async function silenceBudgetAlerts(): Promise<void> {
  const { error } = await supabase.rpc('silence_budget_alerts');
  if (error) throw error;
}
