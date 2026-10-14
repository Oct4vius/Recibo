import { MailAuthError, MailTransientError, type TokenSet } from './types.ts';

export const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
/** Solo lectura de correo + refresh token + correo de la cuenta (id_token). */
export const MS_SCOPES = 'openid email offline_access Mail.Read';

type Json = Record<string, unknown>;

/** Llama al endpoint de tokens como cliente público. Los errores nunca incluyen códigos ni tokens. */
async function tokenRequest(params: Record<string, string>, fetchImpl: typeof fetch): Promise<Json> {
  let response: Response;
  try {
    response = await fetchImpl(MS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
  } catch {
    throw new MailTransientError('token endpoint unreachable');
  }
  const json = (await response.json().catch(() => ({}))) as Json;
  if (response.ok) return json;
  const code = typeof json.error === 'string' ? json.error : 'unknown_error';
  if (response.status === 429 || response.status >= 500) throw new MailTransientError(`token endpoint ${response.status}`);
  if (code === 'invalid_grant') throw new MailAuthError(code);
  throw new Error(`token endpoint error: ${code}`);
}

export function emailFromIdToken(idToken: unknown): string | null {
  if (typeof idToken !== 'string') return null;
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Json;
    const raw = typeof claims.email === 'string' ? claims.email : claims.preferred_username;
    if (typeof raw !== 'string' || !raw.includes('@')) return null;
    return raw.trim().toLowerCase();
  } catch {
    return null;
  }
}

export async function exchangeCode(
  input: { clientId: string; code: string; codeVerifier: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ refreshToken: string; email: string }> {
  const json = await tokenRequest(
    {
      client_id: input.clientId,
      grant_type: 'authorization_code',
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
      scope: MS_SCOPES,
    },
    fetchImpl,
  );
  const email = emailFromIdToken(json.id_token);
  if (typeof json.refresh_token !== 'string' || !email) throw new Error('incomplete token response');
  return { refreshToken: json.refresh_token, email };
}

export async function refreshTokens(clientId: string, refreshToken: string, fetchImpl: typeof fetch = fetch): Promise<TokenSet> {
  const json = await tokenRequest(
    { client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken, scope: MS_SCOPES },
    fetchImpl,
  );
  if (typeof json.access_token !== 'string') throw new Error('token endpoint returned no access token');
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : refreshToken,
  };
}
