import { BAD_REQUEST, bearerToken, json, readJsonObject, UNAUTHORIZED } from '../_shared/http.ts';
import { MailAuthError, type MailProviderName, MissingScopeError, NoRefreshTokenError } from '../_shared/mail/types.ts';

export interface LinkedTokens {
  refreshToken: string;
  email: string;
}

export interface LinkMessages {
  codeExpired: string;
  noRefreshToken: string;
  missingScope: string;
}

/** Canje de un proveedor. `prepare` valida el cuerpo y devuelve el canje listo para correr, o null si es inválido. */
export interface CodeExchanger {
  messages: LinkMessages;
  prepare(body: Record<string, unknown>): (() => Promise<LinkedTokens>) | null;
}

export interface LinkDeps {
  userIdFromToken(token: string): Promise<string | null>;
  exchangers: Partial<Record<MailProviderName, CodeExchanger>>;
  linkAccount(userId: string, provider: MailProviderName, email: string, refreshToken: string): Promise<string>;
}

const LINK_FAILED = { error: 'No se pudo vincular la cuenta. Intenta de nuevo.' };

/** Canjea el código en el servidor con el canjeador del proveedor; la app nunca ve tokens. */
export function createLinkHandler(deps: LinkDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') return json(BAD_REQUEST, 405);
    const token = bearerToken(request);
    const userId = token ? await deps.userIdFromToken(token) : null;
    if (!userId) return json(UNAUTHORIZED, 401);
    const body = await readJsonObject(request);
    const provider = body?.provider;
    // Object.hasOwn: 'constructor' o '__proto__' no son proveedores.
    if (!body || typeof provider !== 'string' || !Object.hasOwn(deps.exchangers, provider)) return json(BAD_REQUEST, 400);
    const exchanger = deps.exchangers[provider as MailProviderName];
    const run = exchanger?.prepare(body);
    if (!exchanger || !run) return json(BAD_REQUEST, 400);
    try {
      const { refreshToken, email } = await run();
      const accountId = await deps.linkAccount(userId, provider as MailProviderName, email, refreshToken);
      return json({ accountId, email });
    } catch (error) {
      if (error instanceof MailAuthError) return json({ error: exchanger.messages.codeExpired }, 400);
      if (error instanceof NoRefreshTokenError) return json({ error: exchanger.messages.noRefreshToken }, 400);
      if (error instanceof MissingScopeError) return json({ error: exchanger.messages.missingScope }, 400);
      return json(LINK_FAILED, 502);
    }
  };
}
