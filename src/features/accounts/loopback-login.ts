// Sin Node ni Expo: lo cargan los scripts de desarrollo y la app de escritorio.
import { GOOGLE_SCOPES } from '../../../supabase/functions/_shared/mail/google-auth.ts';

export const LOOPBACK_PORT = 53682;
/** Se registra `http://localhost:53682/callback` en el cliente OAuth (Microsoft no ignora el puerto en cuentas personales). */
export const LOOPBACK_REDIRECT = `http://localhost:${LOOPBACK_PORT}/callback`;

export const MS_AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
export const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
export const MS_SCOPES = 'openid email offline_access Mail.Read';
export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Challenge S256 (RFC 7636) del verifier. */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export async function createPkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  return { verifier, challenge: await challengeFor(verifier) };
}

export function microsoftAuthorizeUrl(clientId: string, challenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: LOOPBACK_REDIRECT,
    response_mode: 'query',
    scope: MS_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'select_account',
  });
  return `${MS_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * URL de login en el navegador con el cliente Web. Sin PKCE: el cuerpo `gmail` de link-account no lleva `codeVerifier`.
 * `prompt=consent` garantiza refresh token aunque la cuenta ya haya dado su consentimiento.
 */
export function googleAuthorizeUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: LOOPBACK_REDIRECT,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account',
    state,
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}
