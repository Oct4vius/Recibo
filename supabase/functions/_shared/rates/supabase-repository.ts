import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { Database } from '../database.types.ts';
import type { UsdRatesRepository } from './repository.ts';

export function createUsdRatesRepository(db: SupabaseClient<Database>): UsdRatesRepository {
  return {
    async fetchWindow() {
      const { data, error } = await db.rpc('usd_rates_fetch_window').single();
      if (error) throw new Error(error.message);
      return { from: data.from_date, to: data.to_date };
    },
    async save(rates, sourceId) {
      if (rates.length === 0) return;
      const fetchedAt = new Date().toISOString();
      const rows = rates.map((rate) => ({ rate_date: rate.date, sell: rate.sell, source: sourceId, fetched_at: fetchedAt }));
      const { error } = await db.from('usd_rates').upsert(rows, { onConflict: 'rate_date' });
      if (error) throw new Error(error.message);
    },
  };
}
