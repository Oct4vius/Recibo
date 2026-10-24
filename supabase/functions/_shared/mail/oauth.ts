import { MailAuthError, MailTransientError, PROVIDER_TIMEOUT_MS } from './types.ts';

export type TokenJson = Record<string, unknown>;

/** POST a un endpoint de tokens OAuth. Los errores nunca incluyen los parámetros enviados (códigos, secretos). */
export async function postTokenForm(url: string, params: Record<string, string>, fetchImpl: typeof fetch): Promise<TokenJson> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new MailTransientError('token endpoint unreachable');
  }
  const json = (await response.json().catch(() => ({}))) as TokenJson;
  if (response.ok) return json;
  const code = typeof json.error === 'string' ? json.error : 'unknown_error';
  if (response.status === 429 || response.status >= 500) throw new MailTransientError(`token endpoint ${response.status}`);
  if (code === 'invalid_grant') throw new MailAuthError(code);
  throw new Error(`token endpoint error: ${code}`);
}

/** Correo (minúsculas) del id_token, o null. No verifica la firma: el token viene directo del endpoint de tokens. */
export function emailFromIdToken(idToken: unknown): string | null {
  if (typeof idToken !== 'string') return null;
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as TokenJson;
    const raw = typeof claims.email === 'string' ? claims.email : claims.preferred_username;
    if (typeof raw !== 'string' || !raw.includes('@')) return null;
    return raw.trim().toLowerCase();
  } catch {
    return null;
  }
}
