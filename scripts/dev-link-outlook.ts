// Vincula una cuenta de Outlook a un usuario llamando a link-account real (local o remoto).
// Uso: bun run dev:link-outlook [--target local|remote]. Requiere en .env.local:
// EXPO_PUBLIC_MS_CLIENT_ID, DEV_USER_EMAIL y DEV_USER_PASSWORD (un usuario existente del objetivo).
import { randomUUID } from 'node:crypto';
import { devSession, postLinkAccount } from './lib/dev-session';
import { parseTarget } from './lib/dev-target';
import { LOOPBACK_REDIRECT, openBrowser, waitForCode } from './lib/loopback';
import { authorizeUrl, createPkce } from './lib/ms-login';

async function main(): Promise<void> {
  const target = parseTarget(process.argv.slice(2));
  const clientId = process.env.EXPO_PUBLIC_MS_CLIENT_ID;
  if (!clientId) throw new Error('Falta EXPO_PUBLIC_MS_CLIENT_ID en .env.local');
  const session = await devSession(target);

  const { verifier, challenge } = createPkce();
  const state = randomUUID();
  const loginUrl = authorizeUrl(clientId, challenge, state);
  // La URL no lleva secretos (el challenge es un hash del verifier); sirve si el navegador no se abre solo.
  console.log(`Abriendo el inicio de sesión de Microsoft en el navegador… Si no se abre, abre esta URL:\n${loginUrl}`);
  openBrowser(loginUrl);
  const code = await waitForCode(state);

  const { status, json } = await postLinkAccount(session, { provider: 'outlook', code, codeVerifier: verifier, redirectUri: LOOPBACK_REDIRECT });
  console.log(`link-account → ${status}`, json);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
