import { bearerToken, json, UNAUTHORIZED } from '../_shared/http.ts';
import { type MailProviderName, parseCursor } from '../_shared/mail/types.ts';
import type { SyncAccount } from '../_shared/sync/repository.ts';
import type { SyncOutcome } from '../_shared/sync/sync-account.ts';

export interface SyncMailDeps {
  secret: string;
  listActiveAccounts(): Promise<SyncAccount[]>;
  syncOne(account: SyncAccount): Promise<SyncOutcome>;
}

/** Disparada por pg_cron con SYNC_MAIL_SECRET. Un error en una cuenta no aborta las demás. */
export function createSyncMailHandler(deps: SyncMailDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (bearerToken(request) !== deps.secret) return json(UNAUTHORIZED, 401);
    const accounts = await deps.listActiveAccounts();
    const outcomes = [];
    for (const account of accounts) {
      let outcome: SyncOutcome;
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
