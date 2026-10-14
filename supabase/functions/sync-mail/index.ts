import { createServiceClient } from '../_shared/db.ts';
import { providerFor } from '../_shared/mail/registry.ts';
import { parseCursor } from '../_shared/mail/types.ts';
import { parseEmail } from '../_shared/parsers/index.ts';
import type { SyncAccount } from '../_shared/sync/repository.ts';
import { syncAccount } from '../_shared/sync/sync-account.ts';
import { createSupabaseRepository } from '../_shared/sync/supabase-repository.ts';
import { createSyncMailHandler } from './handler.ts';

const MAX_PAGES_PER_RUN = 10;
const db = createServiceClient();
const repo = createSupabaseRepository(db);
const msClientId = Deno.env.get('MS_CLIENT_ID');
const secret = Deno.env.get('SYNC_MAIL_SECRET');
if (!msClientId || !secret) throw new Error('missing MS_CLIENT_ID or SYNC_MAIL_SECRET');

Deno.serve(
  createSyncMailHandler({
    secret,
    listActiveAccounts: async () => {
      const { data, error } = await db.from('linked_accounts').select('id, user_id, provider, sync_cursor').eq('status', 'active');
      if (error) throw new Error(error.message);
      const accounts: SyncAccount[] = [];
      for (const row of data) {
        const cursor = parseCursor(row.sync_cursor);
        if (cursor) accounts.push({ id: row.id, userId: row.user_id, provider: row.provider, cursor });
        else await repo.markAccount(row.id, { status: 'error', lastError: 'Estado de sincronización inválido. Vuelve a vincular.', lastSyncAt: null });
      }
      return accounts;
    },
    syncOne: (account) => {
      const provider = providerFor(account.provider, { msClientId });
      if (!provider) return Promise.resolve({ status: 'error', fetched: 0, parsed: 0, unparsed: 0, pages: 0 });
      return syncAccount(account, { provider, repo, parse: parseEmail, maxPages: MAX_PAGES_PER_RUN, now: () => new Date() });
    },
  }),
);
