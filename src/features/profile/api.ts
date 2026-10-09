import { supabase } from '@/lib/supabase';
import type { Currency, TablesUpdate } from '@/types/database';

export interface Profile {
  primaryCurrency: Currency;
  timeZone: string;
  usdRate: number;
  alertThresholds: number[];
}

/** Lo que Ajustes puede cambiar del perfil (nombres de columna). */
export type ProfilePatch = Pick<TablesUpdate<'profiles'>, 'timezone' | 'primary_currency' | 'usd_rate' | 'alert_thresholds'>;

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('primary_currency, timezone, usd_rate, alert_thresholds')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return {
    primaryCurrency: data.primary_currency,
    timeZone: data.timezone,
    usdRate: data.usd_rate,
    alertThresholds: data.alert_thresholds,
  };
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId);
  if (error) throw error;
}
