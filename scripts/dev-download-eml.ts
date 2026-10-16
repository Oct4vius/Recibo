// Descarga el MIME original de los correos sin procesar de una cuenta vinculada, para crear fixtures.
// Uso: bun run dev:download-eml --account <correo> [--target local|remote] [--all]
// Login en el navegador con la cuenta; el access token vive solo en memoria. Nunca lee Vault ni revoca nada.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { exchangeGoogleCode, refreshGoogleTokens } from '../supabase/functions/_shared/mail/google-auth';
import { exchangeCode, refreshTokens } from '../supabase/functions/_shared/mail/microsoft-auth';
import type { MailProviderName } from '../supabase/functions/_shared/mail/types';
import { devSession } from './lib/dev-session';
import { flagValue, functionsEnv, parseTarget } from './lib/dev-target';
import { googleAuthorizeUrl } from './lib/google-login';
import { LOOPBACK_REDIRECT, openBrowser, waitForCode } from './lib/loopback';
import { authorizeUrl, createPkce } from './lib/ms-login';
import { downloadPath, rawMessageBytes, rawMessageRequest } from './lib/raw-mail';

type BrowserLogin = () => Promise<{ accessToken: string; email: string }>;

async function outlookLogin(): Promise<{ accessToken: string; email: string }> {
  const clientId = process.env.EXPO_PUBLIC_MS_CLIENT_ID;
  if (!clientId) throw new Error('Falta EXPO_PUBLIC_MS_CLIENT_ID en .env.local');
  const state = randomUUID();
  const { verifier, challenge } = createPkce();
  const loginUrl = authorizeUrl(clientId, challenge, state);
  console.log(`Abriendo el inicio de sesión de Microsoft… Si no se abre, abre esta URL:
${loginUrl}`);
  openBrowser(loginUrl);
  const code = await waitForCode(state);
  const linked = await exchangeCode({ clientId, code, codeVerifier: verifier, redirectUri: LOOPBACK_REDIRECT });
  return { accessToken: (await refreshTokens(clientId, linked.refreshToken)).accessToken, email: linked.email };
}

async function gmailLogin(): Promise<{ accessToken: string; email: string }> {
  const env = functionsEnv();
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en supabase/functions/.env');
  const state = randomUUID();
  const loginUrl = googleAuthorizeUrl(clientId, state);
  console.log(`Abriendo el inicio de sesión de Google… Si no se abre, abre esta URL:
${loginUrl}`);
  openBrowser(loginUrl);
  const code = await waitForCode(state);
  const linked = await exchangeGoogleCode({ clientId, clientSecret, code, redirectUri: LOOPBACK_REDIRECT });
  // Nunca se revoca el token de Google: revocar invalida el permiso completo del cliente y desvincularía la cuenta real.
  return { accessToken: (await refreshGoogleTokens(clientId, clientSecret, linked.refreshToken)).accessToken, email: linked.email };
}

/** Login en el navegador por proveedor; el access token vive solo en memoria. */
const BROWSER_LOGINS: Record<MailProviderName, BrowserLogin> = { outlook: outlookLogin, gmail: gmailLogin };

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const target = parseTarget(argv);
  const wanted = flagValue(argv, '--account')?.toLowerCase() ?? null;
  const session = await devSession(target);

  const { data: accounts, error: accountsError } = await session.client.from('linked_accounts').select('id, provider, email');
  if (accountsError) throw new Error(accountsError.message);
  const account = accounts.find((a) => a.email.toLowerCase() === wanted);
  if (!account) {
    throw new Error(`Indica una cuenta con --account <correo>. Vinculadas: ${accounts.map((a) => a.email).join(', ') || '(ninguna)'}`);
  }

  let query = session.client.from('unparsed_emails').select('message_id, bank_code, received_at').eq('linked_account_id', account.id);
  if (!argv.includes('--all')) query = query.eq('resolved', false);
  const { data: emails, error: emailsError } = await query;
  if (emailsError) throw new Error(emailsError.message);
  if (emails.length === 0) {
    console.log('No hay correos sin procesar para esa cuenta.');
    return;
  }

  const login = await BROWSER_LOGINS[account.provider as MailProviderName]();
  if (login.email !== account.email.toLowerCase()) throw new Error('Iniciaste sesión con otra cuenta; no se descargó nada.');

  let downloaded = 0;
  let existing = 0;
  let failed = 0;
  for (const email of emails) {
    const path = downloadPath(email.bank_code, email.received_at, email.message_id);
    if (existsSync(path)) {
      existing += 1;
      continue;
    }
    try {
      const { url, headers } = rawMessageRequest(account.provider, email.message_id);
      const response = await fetch(url, { headers: { ...headers, Authorization: `Bearer ${login.accessToken}` } });
      if (!response.ok) {
        console.warn(`${path}: ${response.status === 404 ? 'el correo ya no existe (404)' : `error ${response.status}`}`);
        failed += 1;
        continue;
      }
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, await rawMessageBytes(account.provider, response));
      downloaded += 1;
    } catch (err) {
      console.warn(`${path}: ${err instanceof Error ? err.message : 'error desconocido'}`);
      failed += 1;
    }
  }
  console.log(`Descargados: ${downloaded}, existentes: ${existing}, fallidos: ${failed}.`);
  console.log('Anonimiza con `bun run eml:anonymize` antes de moverlos fuera de `_downloaded/`.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
