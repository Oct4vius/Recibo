import { supabase } from '@/lib/supabase';
import type { Currency } from '@/types/database';

export interface Profile {
  primaryCurrency: Currency;
  timeZone: string;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('primary_currency, timezone').eq('user_id', userId).single();
  if (error) throw error;
  return { primaryCurrency: data.primary_currency, timeZone: data.timezone };
}
