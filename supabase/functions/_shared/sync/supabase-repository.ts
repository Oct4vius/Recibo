import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { Database } from '../database.types.ts';
import type { IngestResult, SyncRepository } from './repository.ts';

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function createSupabaseRepository(db: SupabaseClient<Database>): SyncRepository {
  return {
    async readToken(accountId) {
      const { data, error } = await db.rpc('mail_account_token', { p_account_id: accountId });
      fail(error);
      return (data as string | null) ?? null;
    },
    async saveToken(accountId, token) {
      const { error } = await db.rpc('set_mail_account_token', { p_account_id: accountId, p_token: token });
      fail(error);
    },
    async ingest(accountId, rows) {
      const { data, error } = await db.rpc('ingest_transactions', { p_account_id: accountId, p_rows: rows as unknown as Database['public']['Functions']['ingest_transactions']['Args']['p_rows'] });
      fail(error);
      const result = data as Partial<IngestResult> & { status: IngestResult['status'] };
      return { status: result.status, inserted: result.inserted ?? 0, duplicates: result.duplicates ?? 0, paired: result.paired ?? 0, unmatched: result.unmatched ?? 0 };
    },
    async saveUnparsed(account, emails) {
      const { error } = await db.from('unparsed_emails').upsert(
        emails.map((email) => ({ ...email, user_id: account.userId, linked_account_id: account.id })),
        { onConflict: 'linked_account_id,message_id', ignoreDuplicates: true },
      );
      fail(error);
    },
    async advanceCursor(accountId, cursor) {
      const { error } = await db.from('linked_accounts').update({ sync_cursor: JSON.stringify(cursor) }).eq('id', accountId).neq('status', 'revoked');
      fail(error);
    },
    async markAccount(accountId, state) {
      const { error } = await db
        .from('linked_accounts')
        .update({ status: state.status, last_error: state.lastError, ...(state.lastSyncAt ? { last_sync_at: state.lastSyncAt } : {}) })
        .eq('id', accountId)
        .neq('status', 'revoked');
      fail(error);
    },
    async logSync(log) {
      const { error } = await db.from('sync_logs').insert({
        linked_account_id: log.accountId,
        user_id: log.userId,
        started_at: log.startedAt,
        finished_at: log.finishedAt,
        fetched: log.fetched,
        parsed: log.parsed,
        unparsed: log.unparsed,
        error: log.error,
      });
      fail(error);
    },
  };
}
