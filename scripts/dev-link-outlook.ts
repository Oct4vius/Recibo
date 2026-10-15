// Vincula una cuenta de Outlook a un usuario llamando a link-account real (local o remoto).
// Uso: bun run dev:link-outlook [--target local|remote]. Requiere en .env.local:
// EXPO_PUBLIC_MS_CLIENT_ID, DEV_USER_EMAIL y DEV_USER_PASSWORD (un usuario existente del objetivo).
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { parseTarget, supabaseApi } from './lib/dev-target';
import { authorizeUrl, createPkce, LOOPBACK_REDIRECT, openBrowser, waitForCode } from './lib/ms-login';

async function main(): Promise<void> {
  const target = parseTarget(process.argv.slice(2));
  const { url, anonKey } = supabaseApi(target);
  const clientId = process.env.EXPO_PUBLIC_MS_CLIENT_ID;
  const email = process.env.DEV_USER_EMAIL;
  const password = process.env.DEV_USER_PASSWORD;
  if (!clientId || !email || !password) throw new Error('Faltan EXPO_PUBLIC_MS_CLIENT_ID, DEV_USER_EMAIL o DEV_USER_PASSWORD en .env.local');

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`No se pudo iniciar sesión en ${target}: ${error?.message ?? 'sin sesión'}`);

  const { verifier, challenge } = createPkce();
  const state = randomUUID();
  const loginUrl = authorizeUrl(clientId, challenge, state);
  // La URL no lleva secretos (el challenge es un hash del verifier); sirve si el navegador no se abre solo.
  console.log(`Abriendo el inicio de sesión de Microsoft en el navegador… Si no se abre, abre esta URL:\n${loginUrl}`);
  openBrowser(loginUrl);
  const code = await waitForCode(state);

  const response = await fetch(`${url}/functions/v1/link-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'outlook', code, codeVerifier: verifier, redirectUri: LOOPBACK_REDIRECT }),
  });
  console.log(`link-account → ${response.status}`, await response.json());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
