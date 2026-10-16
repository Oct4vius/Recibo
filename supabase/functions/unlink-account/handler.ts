import { BAD_REQUEST, bearerToken, json, readJsonObject, UNAUTHORIZED } from '../_shared/http.ts';
import type { MailProviderName } from '../_shared/mail/types.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNLINK_FAILED = { error: 'No se pudo desvincular la cuenta. Intenta de nuevo.' };

export interface UnlinkDeps {
  userIdFromToken(token: string): Promise<string | null>;
  /** Cuenta del usuario, no revocada. null = no existe o es de otro usuario. */
  findAccount(userId: string, accountId: string): Promise<{ provider: MailProviderName } | null>;
  /** Refresh token de Vault (solo cuentas activas; null si no hay). Solo se llama tras findAccount. */
  readToken(accountId: string): Promise<string | null>;
  /** Revocación en el proveedor, si lo permite (Google sí; Microsoft no en cuentas personales). */
  revokers: Partial<Record<MailProviderName, (refreshToken: string) => Promise<void>>>;
  unlink(userId: string, accountId: string): Promise<boolean>;
}

/** Revoca en el proveedor (best effort), borra el secreto de Vault y deja la cuenta `revoked`. Los movimientos se quedan. */
export function createUnlinkHandler(deps: UnlinkDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') return json(BAD_REQUEST, 405);
    const token = bearerToken(request);
    const userId = token ? await deps.userIdFromToken(token) : null;
    if (!userId) return json(UNAUTHORIZED, 401);
    const accountId = (await readJsonObject(request))?.accountId;
    if (typeof accountId !== 'string' || !UUID.test(accountId)) return json(BAD_REQUEST, 400);
    try {
      const account = await deps.findAccount(userId, accountId);
      if (!account) return json({ error: 'Cuenta no encontrada' }, 404);
      const revoke = deps.revokers[account.provider];
      if (revoke) {
        try {
          const refreshToken = await deps.readToken(accountId);
          if (refreshToken) await revoke(refreshToken);
        } catch {
          // Texto fijo: nunca el error (podría traer el token). Desvincular debe terminar igual.
          // Si la revocación falló, el permiso puede seguir en Google: el usuario lo ve en myaccount.google.com/permissions
          // (el aviso de la app lo dice) y una nueva vinculación lo sustituye.
          console.error('unlink-account: token revocation failed');
        }
      }
      return (await deps.unlink(userId, accountId)) ? json({ ok: true }) : json({ error: 'Cuenta no encontrada' }, 404);
    } catch {
      return json(UNLINK_FAILED, 502);
    }
  };
}
