import { createServiceClient } from '../_shared/db.ts';
import { providerFor } from '../_shared/mail/registry.ts';
import { parseEmail } from '../_shared/parsers/index.ts';
import { syncAccount } from '../_shared/sync/sync-account.ts';
import { createSupabaseRepository } from '../_shared/sync/supabase-repository.ts';
import { createSyncMailHandler, shuffled, toSyncAccounts } from './handler.ts';

const MAX_PAGES_PER_RUN = 10;
/** Margen bajo el límite de reloj de las Edge Functions (150 s en el plan gratuito): no se empiezan cuentas después. */
const RUN_BUDGET_MS = 100_000;
const db = createServiceClient();
const repo = createSupabaseRepository(db);
const msClientId = Deno.env.get('MS_CLIENT_ID');
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
const secret = Deno.env.get('SYNC_MAIL_SECRET');
if (!msClientId || !secret) throw new Error('missing MS_CLIENT_ID or SYNC_MAIL_SECRET');
// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET son opcionales: sin ellos las cuentas Gmail se omiten y Outlook sigue.

const providerConfig = { msClientId, googleClientId, googleClientSecret };

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
    repo,
    now: () => new Date(),
    order: (accounts) => shuffled(accounts),
    runBudgetMs: RUN_BUDGET_MS,
    isConfigured: (name) => providerFor(name, providerConfig) !== null,
    syncOne: (account, deadline) => {
      const registered = providerFor(account.provider, providerConfig);
      // El handler ya omitió los proveedores sin configurar; esto solo estrecha el tipo.
      if (!registered) throw new Error('provider not configured');
      const { provider, expiredSession } = registered;
      return syncAccount(account, { provider, repo, parse: parseEmail, maxPages: MAX_PAGES_PER_RUN, now: () => new Date(), expiredSession, deadline });
    },
  }),
);
