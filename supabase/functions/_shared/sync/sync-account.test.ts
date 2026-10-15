import { assertEquals } from 'jsr:@std/assert@1';
import type { ParseResult, RawEmail } from '../parsers/index.ts';
import { MailAuthError, MailTransientError, type MailProvider, type Page, type SyncCursor } from '../mail/types.ts';
import type { IngestResult, SyncAccount, SyncLog, SyncRepository } from './repository.ts';
import { EXPIRED_SESSION, SYNC_FAILED, syncAccount } from './sync-account.ts';

const cursor0: SyncCursor = { since: '2026-09-01T04:00:00Z', next: null, maxSeen: null };
const account: SyncAccount = { id: 'acc', userId: 'u', provider: 'outlook', cursor: cursor0 };
const now = () => new Date('2026-10-10T12:00:00Z');

function email(id: string, from = 'Alertas@bhd.com.do'): RawEmail {
  return { messageId: id, from, subject: 's', text: 't', receivedAt: '2026-09-16T02:43:15Z' };
}

function fakeRepo(ingestStatus: IngestResult['status'] = 'ok') {
  const calls: string[] = [];
  const logs: SyncLog[] = [];
  const cursors: SyncCursor[] = [];
  const marks: Parameters<SyncRepository['markAccount']>[1][] = [];
  const repo: SyncRepository = {
    readToken: () => (calls.push('readToken'), Promise.resolve('rt-old')),
    saveToken: (_id, token) => (calls.push(`saveToken:${token}`), Promise.resolve()),
    ingest: (_id, rows) => (calls.push(`ingest:${rows.length}`), Promise.resolve({ status: ingestStatus, inserted: rows.length, duplicates: 0, paired: 0, unmatched: 0 })),
    saveUnparsed: (_a, emails) => (calls.push(`unparsed:${emails.length}`), Promise.resolve()),
    advanceCursor: (_id, cursor) => (cursors.push(cursor), Promise.resolve()),
    markAccount: (_id, state) => (marks.push(state), calls.push(`mark:${state.status}:${state.lastSyncAt ? 'synced' : 'kept'}`), Promise.resolve()),
    logSync: (log) => (logs.push(log), Promise.resolve()),
  };
  return { repo, calls, logs, cursors, marks };
}

function fakeProvider(pages: Page[], refresh: () => Promise<{ accessToken: string; refreshToken: string }>, calls?: string[]): MailProvider {
  return {
    refreshToken: () => (calls?.push('refresh'), refresh()),
    fetchNew: () => (calls?.push('fetch'), Promise.resolve(pages.shift() ?? { emails: [], cursor: cursor0, hasMore: false })),
  };
}

const parse = (e: RawEmail): ParseResult =>
  e.from.endsWith('bhd.com.do')
    ? { kind: 'parsed', bankCode: 'bhd', transactions: [{ bankCode: 'bhd', type: 'card_purchase', amount: 1, currency: 'DOP', merchant: 'X', occurredAt: '2026-09-16T00:00:00-04:00', rowIndex: 0, templateId: 'bhd/transactions-table' }] }
    : { kind: 'unparsed', bankCode: 'apap' };

Deno.test('regression — the rotated refresh token is saved before any mail is fetched', async () => {
  const { repo, calls } = fakeRepo();
  const provider = fakeProvider([{ emails: [email('a')], cursor: cursor0, hasMore: false }], () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-new' }), calls);
  await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(calls.slice(0, 4), ['readToken', 'refresh', 'saveToken:rt-new', 'fetch']);
});

Deno.test('ingests parsed rows, stores unparsed bank emails and advances the cursor per page', async () => {
  const { repo, calls, cursors, logs } = fakeRepo();
  const c1 = { ...cursor0, next: 'n', maxSeen: '2026-09-16T02:43:15Z' };
  const c2 = { since: '2026-09-16T02:43:15Z', next: null, maxSeen: null };
  const provider = fakeProvider(
    [
      { emails: [email('a'), email('b', 'avisos@apap.com.do')], cursor: c1, hasMore: true },
      { emails: [email('c')], cursor: c2, hasMore: false },
    ],
    () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-old' }),
  );
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome, { status: 'ok', fetched: 3, parsed: 2, unparsed: 1, pages: 2 });
  assertEquals(cursors, [c1, c2]);
  assertEquals(calls.includes('unparsed:1'), true);
  assertEquals(calls.includes('mark:active:synced'), true);
  assertEquals(logs[0].error, null);
});

Deno.test('an ignored email is counted as fetched but neither ingested nor stored as unparsed', async () => {
  const { repo, calls } = fakeRepo();
  const provider = fakeProvider([{ emails: [email('a')], cursor: cursor0, hasMore: false }], () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-old' }));
  const ignore = (): ParseResult => ({ kind: 'ignored', bankCode: 'bhd' });
  const outcome = await syncAccount(account, { provider, repo, parse: ignore, maxPages: 10, now });
  assertEquals(outcome, { status: 'ok', fetched: 1, parsed: 0, unparsed: 0, pages: 1 });
  assertEquals(calls.some((c) => c.startsWith('ingest') || c.startsWith('unparsed')), false);
});

Deno.test('a run without new bank mail still records last_sync_at', async () => {
  const { repo, calls } = fakeRepo();
  const provider = fakeProvider([{ emails: [], cursor: cursor0, hasMore: false }], () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-old' }));
  await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(calls.includes('mark:active:synced'), true);
});

Deno.test('stops at maxPages and resumes from the saved cursor next run', async () => {
  const { repo, cursors } = fakeRepo();
  const pages: Page[] = Array.from({ length: 5 }, (_, i) => ({ emails: [email(`m${i}`)], cursor: { ...cursor0, next: `n${i}` }, hasMore: true }));
  const provider = fakeProvider(pages, () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-old' }));
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 2, now });
  assertEquals(outcome.pages, 2);
  assertEquals(cursors.at(-1)?.next, 'n1');
});

Deno.test('a skipped ingest (another run holds the lock) does not advance the cursor', async () => {
  const { repo, cursors } = fakeRepo('skipped');
  const provider = fakeProvider([{ emails: [email('a')], cursor: { ...cursor0, since: 'later' }, hasMore: false }], () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-old' }));
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome.status, 'skipped');
  assertEquals(cursors, []);
});

Deno.test('an expired session marks the account for relinking', async () => {
  const { repo, calls, logs } = fakeRepo();
  const provider = fakeProvider([], () => Promise.reject(new MailAuthError('invalid_grant')));
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome.status, 'auth_error');
  assertEquals(calls.includes('mark:error:kept'), true);
  assertEquals(logs[0].error, EXPIRED_SESSION);
});

Deno.test('regression — a token rotated by an overlapping run makes this run skip instead of breaking the account', async () => {
  const { repo, calls, logs } = fakeRepo();
  let reads = 0;
  repo.readToken = () => Promise.resolve(reads++ === 0 ? 'rt-old' : 'rt-rotated-by-other-run');
  const provider = fakeProvider([], () => Promise.reject(new MailAuthError('invalid_grant')));
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome.status, 'skipped');
  assertEquals(calls.some((c) => c.startsWith('mark:error')), false);
  assertEquals(logs[0].error, null);
});

Deno.test('a transient provider error keeps the account active and the cursor in place', async () => {
  const { repo, calls, cursors } = fakeRepo();
  const provider = fakeProvider([], () => Promise.reject(new MailTransientError('503')));
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome.status, 'transient_error');
  assertEquals(calls.some((c) => c.startsWith('mark:')), false);
  assertEquals(cursors, []);
});

Deno.test('regression — a rejected session after this run\'s own token rotation still marks the account', async () => {
  const { repo, calls, logs } = fakeRepo();
  let saved = 'rt-old';
  repo.readToken = () => Promise.resolve(saved);
  repo.saveToken = (_id, token) => {
    saved = token;
    return Promise.resolve();
  };
  const provider: MailProvider = {
    refreshToken: () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-new' }),
    fetchNew: () => Promise.reject(new MailAuthError('graph 401')),
  };
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome.status, 'auth_error');
  assertEquals(calls.includes('mark:error:kept'), true);
  assertEquals(logs[0].error, EXPIRED_SESSION);
});

Deno.test('a failed saveToken stops the run before any fetch', async () => {
  const { repo, calls, logs, cursors, marks } = fakeRepo();
  repo.saveToken = () => Promise.reject(new Error('vault down'));
  const provider = fakeProvider([{ emails: [email('a')], cursor: cursor0, hasMore: false }], () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-new' }), calls);
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome.status, 'error');
  assertEquals(calls.includes('fetch'), false);
  assertEquals(cursors, []);
  assertEquals(logs[0].error, 'vault down');
  assertEquals(marks, [{ status: 'active', lastError: SYNC_FAILED, lastSyncAt: null }]);
});

Deno.test('regression — a generic error shows on the account, keeps it active and keeps last_sync_at', async () => {
  const { repo, logs, marks } = fakeRepo();
  repo.ingest = () => Promise.reject(new Error('duplicate key value violates unique constraint'));
  const provider = fakeProvider([{ emails: [email('a')], cursor: cursor0, hasMore: false }], () => Promise.resolve({ accessToken: 'at', refreshToken: 'rt-old' }));
  const outcome = await syncAccount(account, { provider, repo, parse, maxPages: 10, now });
  assertEquals(outcome.status, 'error');
  assertEquals(marks, [{ status: 'active', lastError: SYNC_FAILED, lastSyncAt: null }]);
  // El texto crudo solo queda en sync_logs, nunca en la cuenta que ve el usuario.
  assertEquals(logs[0].error, 'duplicate key value violates unique constraint');
});
