import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { Database } from './database.types.ts';

/** Cliente service_role para Edge Functions. Nunca se usa en la app. */
export function createServiceClient(): SupabaseClient<Database> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
