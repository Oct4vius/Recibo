import { emailFromIdToken, postTokenForm } from './oauth.ts';
import { MissingScopeError, NoRefreshTokenError, type TokenSet } from './types.ts';

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
/** Solo lectura de correo + correo de la cuenta (id_token). */
export const GOOGLE_SCOPES = `openid email ${GMAIL_SCOPE}`;
export const REVOKE_TIMEOUT_MS = 5_000;

/** Canjea un código de Google (SDK nativo o navegador) con el cliente Web. Los errores nunca incluyen código ni secreto. */
export async function exchangeGoogleCode(
  input: { clientId: string; clientSecret: string; code: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ refreshToken: string; email: string }> {
  const json = await postTokenForm(
    GOOGLE_TOKEN_URL,
    {
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
    },
    fetchImpl,
  );
  const granted = typeof json.scope === 'string' ? json.scope.split(' ') : [];
  if (!granted.includes(GMAIL_SCOPE)) throw new MissingScopeError('gmail scope not granted');
  if (typeof json.refresh_token !== 'string') throw new NoRefreshTokenError('no refresh token');
  const email = emailFromIdToken(json.id_token);
  if (!email) throw new Error('incomplete token response');
  return { refreshToken: json.refresh_token, email };
}

export async function refreshGoogleTokens(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenSet> {
  const json = await postTokenForm(
    GOOGLE_TOKEN_URL,
    { client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken },
    fetchImpl,
  );
  if (typeof json.access_token !== 'string') throw new Error('token endpoint returned no access token');
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : refreshToken,
  };
}

/** Revoca el permiso en Google. Con timeout; el error nunca incluye el token. */
export async function revokeGoogleToken(token: string, fetchImpl: typeof fetch = fetch, timeoutMs = REVOKE_TIMEOUT_MS): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`revoke ${response.status}`);
  } finally {
    clearTimeout(timer);
  }
}
