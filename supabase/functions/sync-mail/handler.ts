import { bearerToken, json, UNAUTHORIZED } from '../_shared/http.ts';
import { type MailProviderName, parseCursor } from '../_shared/mail/types.ts';
import type { SyncAccount, SyncRepository } from '../_shared/sync/repository.ts';
import type { SyncOutcome } from '../_shared/sync/sync-account.ts';

export interface SyncMailDeps {
  secret: string;
  listActiveAccounts(): Promise<SyncAccount[]>;
  /** false = el proveedor de la cuenta no está configurado en este entorno: se omite y se deja constancia. */
  isConfigured(provider: MailProviderName): boolean;
  syncOne(account: SyncAccount): Promise<SyncOutcome>;
  repo: Pick<SyncRepository, 'logSync' | 'markAccount'>;
  now(): Date;
}

export const PROVIDER_NOT_CONFIGURED = 'provider not configured';
const UNAVAILABLE_NOTICE: Partial<Record<MailProviderName, string>> = {
  gmail: 'Gmail no está disponible por ahora. Se reintentará más tarde.',
};
const DEFAULT_UNAVAILABLE_NOTICE = 'Este correo no está disponible por ahora. Se reintentará más tarde.';

/** Deja el salto visible: fila en `sync_logs` y `last_error` en la cuenta (sigue activa y `last_sync_at` no cambia). */
async function recordSkip(deps: SyncMailDeps, account: SyncAccount): Promise<void> {
  const at = deps.now().toISOString();
  try {
    await deps.repo.logSync({ accountId: account.id, userId: account.userId, startedAt: at, finishedAt: at, fetched: 0, parsed: 0, unparsed: 0, error: PROVIDER_NOT_CONFIGURED });
    await deps.repo.markAccount(account.id, {
      status: 'active',
      lastError: UNAVAILABLE_NOTICE[account.provider] ?? DEFAULT_UNAVAILABLE_NOTICE,
      lastSyncAt: null,
    });
  } catch {
    console.error('sync-mail: could not record a skipped account');
  }
}

/** Disparada por pg_cron con SYNC_MAIL_SECRET. Un error en una cuenta no aborta las demás. */
export function createSyncMailHandler(deps: SyncMailDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (bearerToken(request) !== deps.secret) return json(UNAUTHORIZED, 401);
    const accounts = await deps.listActiveAccounts();
    const outcomes = [];
    for (const account of accounts) {
      let outcome: SyncOutcome;
      if (!deps.isConfigured(account.provider)) {
        // Texto fijo: proveedor sin configurar. No aborta las demás cuentas.
        console.error('sync-mail: provider not configured, account skipped');
        await recordSkip(deps, account);
        outcomes.push({ accountId: account.id, status: 'error', fetched: 0, parsed: 0, unparsed: 0 });
        continue;
      }
      try {
        outcome = await deps.syncOne(account);
      } catch {
        // Texto fijo: ni ids ni el mensaje del error (puede traer datos de la cuenta).
        console.error('sync-mail: an account sync failed unexpectedly');
        outcome = { status: 'error', fetched: 0, parsed: 0, unparsed: 0, pages: 0 };
      }
      outcomes.push({ accountId: account.id, status: outcome.status, fetched: outcome.fetched, parsed: outcome.parsed, unparsed: outcome.unparsed });
    }
    return json({ accounts: accounts.length, outcomes });
  };
}

export interface ActiveAccountRow {
  id: string;
  user_id: string;
  provider: MailProviderName;
  sync_cursor: string | null;
}

/** Filas válidas → cuentas. Las de cursor inválido se marcan; si marcar falla, las demás cuentas siguen. */
export async function toSyncAccounts(rows: ActiveAccountRow[], markInvalid: (accountId: string) => Promise<void>): Promise<SyncAccount[]> {
  const accounts: SyncAccount[] = [];
  for (const row of rows) {
    const cursor = parseCursor(row.sync_cursor);
    if (cursor) {
      accounts.push({ id: row.id, userId: row.user_id, provider: row.provider, cursor });
      continue;
    }
    try {
      await markInvalid(row.id);
    } catch {
      console.error('sync-mail: could not mark an account with an invalid cursor');
    }
  }
  return accounts;
}
