import { bearerToken, json, UNAUTHORIZED } from '../_shared/http.ts';
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
        outcome = { status: 'error', fetched: 0, parsed: 0, unparsed: 0, pages: 0 };
      }
      outcomes.push({ accountId: account.id, status: outcome.status, fetched: outcome.fetched, parsed: outcome.parsed, unparsed: outcome.unparsed });
    }
    return json({ accounts: accounts.length, outcomes });
  };
}
