import { supabase } from '@/lib/supabase';

export interface LatestUsdRate {
  /** Fecha de la tasa (YYYY-MM-DD). */
  date: string;
  sell: number;
}

/** Última tasa de venta del BCRD guardada; null si `fetch-usd-rates` aún no ha cargado ninguna. */
export async function fetchLatestUsdRate(): Promise<LatestUsdRate | null> {
  const { data, error } = await supabase
    .from('usd_rates')
    .select('rate_date, sell')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { date: data.rate_date, sell: data.sell } : null;
}
