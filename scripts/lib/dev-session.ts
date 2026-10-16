import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseApi, type Target } from './dev-target';

export interface DevSession {
  url: string;
  anonKey: string;
  accessToken: string;
  client: SupabaseClient;
}

/** Inicia sesión con DEV_USER_EMAIL / DEV_USER_PASSWORD (un usuario existente del objetivo). */
export async function devSession(target: Target): Promise<DevSession> {
  const { url, anonKey } = supabaseApi(target);
  const email = process.env.DEV_USER_EMAIL;
  const password = process.env.DEV_USER_PASSWORD;
  if (!email || !password) throw new Error('Faltan DEV_USER_EMAIL o DEV_USER_PASSWORD en .env.local');
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`No se pudo iniciar sesión en ${target}: ${error?.message ?? 'sin sesión'}`);
  return { url, anonKey, accessToken: data.session.access_token, client };
}

/** POST a link-account con la sesión del usuario de desarrollo. La respuesta nunca trae tokens. */
export async function postLinkAccount(session: DevSession, body: Record<string, string>): Promise<{ status: number; json: unknown }> {
  const response = await fetch(`${session.url}/functions/v1/link-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}`, apikey: session.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}
