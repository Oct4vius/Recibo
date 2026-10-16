import { GOOGLE_SCOPES } from '../../supabase/functions/_shared/mail/google-auth';
import { LOOPBACK_REDIRECT } from './loopback';

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

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
