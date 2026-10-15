import { BAD_REQUEST, bearerToken, json, readJsonObject, UNAUTHORIZED } from '../_shared/http.ts';
import { MailAuthError } from '../_shared/mail/types.ts';

export interface LinkDeps {
  userIdFromToken(token: string): Promise<string | null>;
  exchangeCode(input: { code: string; codeVerifier: string; redirectUri: string }): Promise<{ refreshToken: string; email: string }>;
  linkAccount(userId: string, email: string, refreshToken: string): Promise<string>;
}

const CODE_EXPIRED = { error: 'El código de Microsoft venció o ya se usó. Vuelve a intentarlo.' };
const LINK_FAILED = { error: 'No se pudo vincular la cuenta. Intenta de nuevo.' };

/** Canjea el código PKCE en el servidor; la app nunca ve tokens. */
export function createLinkHandler(deps: LinkDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') return json(BAD_REQUEST, 405);
    const token = bearerToken(request);
    const userId = token ? await deps.userIdFromToken(token) : null;
    if (!userId) return json(UNAUTHORIZED, 401);
    const body = await readJsonObject(request);
    const { provider, code, codeVerifier, redirectUri } = body ?? {};
    if (provider !== 'outlook' || typeof code !== 'string' || typeof codeVerifier !== 'string' || typeof redirectUri !== 'string') {
      return json(BAD_REQUEST, 400);
    }
    try {
      const { refreshToken, email } = await deps.exchangeCode({ code, codeVerifier, redirectUri });
      const accountId = await deps.linkAccount(userId, email, refreshToken);
      return json({ accountId, email });
    } catch (error) {
      return error instanceof MailAuthError ? json(CODE_EXPIRED, 400) : json(LINK_FAILED, 502);
    }
  };
}
