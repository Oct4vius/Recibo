import { createServiceClient } from '../_shared/db.ts';
import { providerFor } from '../_shared/mail/registry.ts';
import { parseEmail } from '../_shared/parsers/index.ts';
import { syncAccount } from '../_shared/sync/sync-account.ts';
import { createSupabaseRepository } from '../_shared/sync/supabase-repository.ts';
import { createSyncMailHandler, toSyncAccounts } from './handler.ts';

const MAX_PAGES_PER_RUN = 10;
const db = createServiceClient();
const repo = createSupabaseRepository(db);
const msClientId = Deno.env.get('MS_CLIENT_ID');
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
const secret = Deno.env.get('SYNC_MAIL_SECRET');
if (!msClientId || !secret) throw new Error('missing MS_CLIENT_ID or SYNC_MAIL_SECRET');
// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET son opcionales: sin ellos las cuentas Gmail se omiten y Outlook sigue.

Deno.serve(
  createSyncMailHandler({
    secret,
    listActiveAccounts: async () => {
      const { data, error } = await db.from('linked_accounts').select('id, user_id, provider, sync_cursor').eq('status', 'active');
      if (error) throw new Error(error.message);
      return toSyncAccounts(data, (accountId) =>
        repo.markAccount(accountId, { status: 'error', lastError: 'Estado de sincronización inválido. Vuelve a vincular.', lastSyncAt: null }),
      );
    },
    syncOne: (account) => {
      const registered = providerFor(account.provider, { msClientId, googleClientId, googleClientSecret });
      if (!registered) {
        // Texto fijo: proveedor sin configurar. No aborta las demás cuentas.
        console.error('sync-mail: provider not configured, account skipped');
        return Promise.resolve({ status: 'error', fetched: 0, parsed: 0, unparsed: 0, pages: 0 });
      }
      const { provider, expiredSession } = registered;
      return syncAccount(account, { provider, repo, parse: parseEmail, maxPages: MAX_PAGES_PER_RUN, now: () => new Date(), expiredSession });
    },
  }),
);
