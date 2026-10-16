import { emailFromIdToken, postTokenForm } from './oauth.ts';
import { NoRefreshTokenError, type TokenSet } from './types.ts';

export const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
/** Solo lectura de correo + refresh token + correo de la cuenta (id_token). */
export const MS_SCOPES = 'openid email offline_access Mail.Read';

export async function exchangeCode(
  input: { clientId: string; code: string; codeVerifier: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ refreshToken: string; email: string }> {
  const json = await postTokenForm(
    MS_TOKEN_URL,
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
  if (typeof json.refresh_token !== 'string') throw new NoRefreshTokenError('no refresh token');
  if (!email) throw new Error('incomplete token response');
  return { refreshToken: json.refresh_token, email };
}

export async function refreshTokens(clientId: string, refreshToken: string, fetchImpl: typeof fetch = fetch): Promise<TokenSet> {
  const json = await postTokenForm(
    MS_TOKEN_URL,
    { client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken, scope: MS_SCOPES },
    fetchImpl,
  );
  if (typeof json.access_token !== 'string') throw new Error('token endpoint returned no access token');
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : refreshToken,
  };
}
