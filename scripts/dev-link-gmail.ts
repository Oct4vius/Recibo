// Vincula una cuenta de Gmail a un usuario llamando a link-account real (local o remoto).
// Uso: bun run dev:link-gmail [--target local|remote]. Requiere en .env.local:
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, DEV_USER_EMAIL y DEV_USER_PASSWORD (un usuario existente del objetivo).
// El cliente Web de Google debe tener registrado el redirect http://localhost:53682/callback.
import { randomUUID } from 'node:crypto';
import { devSession, postLinkAccount } from './lib/dev-session';
import { parseTarget } from './lib/dev-target';
import { googleAuthorizeUrl } from './lib/google-login';
import { LOOPBACK_REDIRECT, openBrowser, waitForCode } from './lib/loopback';

async function main(): Promise<void> {
  const target = parseTarget(process.argv.slice(2));
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!clientId) throw new Error('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env.local');
  const session = await devSession(target);

  const state = randomUUID();
  const loginUrl = googleAuthorizeUrl(clientId, state);
  // La URL no lleva secretos; sirve si el navegador no se abre solo.
  console.log(`Abriendo el inicio de sesión de Google en el navegador… Si no se abre, abre esta URL:\n${loginUrl}`);
  openBrowser(loginUrl);
  const code = await waitForCode(state);

  const { status, json } = await postLinkAccount(session, { provider: 'gmail', code, redirectUri: LOOPBACK_REDIRECT });
  console.log(`link-account → ${status}`, json);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
