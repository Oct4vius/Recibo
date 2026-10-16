import { createHash, randomBytes } from 'node:crypto';
import { LOOPBACK_REDIRECT } from './loopback';

// Re-export: los importadores existentes siguen funcionando.
export { LOOPBACK_PORT, LOOPBACK_REDIRECT, openBrowser, waitForCode } from './loopback';

export const MS_AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
export const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
export const MS_SCOPES = 'openid email offline_access Mail.Read';

export function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(clientId: string, challenge: string, state: string): string {
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
