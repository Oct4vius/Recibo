import { BAD_REQUEST, bearerToken, json, readJsonObject, UNAUTHORIZED } from '../_shared/http.ts';

export interface UnlinkDeps {
  userIdFromToken(token: string): Promise<string | null>;
  unlink(userId: string, accountId: string): Promise<boolean>;
}

/** Borra el secreto de Vault y deja la cuenta `revoked`. Los movimientos importados se quedan. */
export function createUnlinkHandler(deps: UnlinkDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') return json(BAD_REQUEST, 405);
    const token = bearerToken(request);
    const userId = token ? await deps.userIdFromToken(token) : null;
    if (!userId) return json(UNAUTHORIZED, 401);
    const accountId = (await readJsonObject(request))?.accountId;
    if (typeof accountId !== 'string') return json(BAD_REQUEST, 400);
    return (await deps.unlink(userId, accountId)) ? json({ ok: true }) : json({ error: 'Cuenta no encontrada' }, 404);
  };
}
