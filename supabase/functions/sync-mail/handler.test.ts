import { assertEquals } from 'jsr:@std/assert@1';
import type { SyncAccount, SyncLog } from '../_shared/sync/repository.ts';
import type { SyncOutcome } from '../_shared/sync/sync-account.ts';
import { createSyncMailHandler, shuffled, toSyncAccounts } from './handler.ts';

const cursor = { since: '2026-09-01T04:00:00Z', next: null, maxSeen: null };
const accounts: SyncAccount[] = [
  { id: 'a', userId: 'u1', provider: 'outlook', cursor },
  { id: 'b', userId: 'u2', provider: 'outlook', cursor },
];
const req = (token: string) => new Request('http://x/sync-mail', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

type MarkState = { status: 'active' | 'error'; lastError: string | null; lastSyncAt: string | null };

function fakeRepo() {
  const logs: SyncLog[] = [];
  const marks: { accountId: string; state: MarkState }[] = [];
  const repo = {
    logSync: (log: SyncLog) => {
      logs.push(log);
      return Promise.resolve();
    },
    markAccount: (accountId: string, state: MarkState) => {
      marks.push({ accountId, state });
      return Promise.resolve();
    },
  };
  return { repo, logs, marks };
}
const common = () => ({ ...fakeRepo(), isConfigured: () => true, now: () => new Date('2026-10-17T12:00:00Z') });
const { repo: noRepo, isConfigured: allConfigured, now: fixedNow } = common();
const base = { repo: noRepo, isConfigured: allConfigured, now: fixedNow };

Deno.test('only the cron secret can trigger a sync', async () => {
  const handler = createSyncMailHandler({ ...base, secret: 's3cret', listActiveAccounts: () => Promise.resolve(accounts), syncOne: () => Promise.reject(new Error('unreachable')) });
  assertEquals((await handler(req('wrong'))).status, 401);
});

Deno.test('one failing account does not stop the others', async () => {
  const handler = createSyncMailHandler({
    ...base,
    secret: 's3cret',
    listActiveAccounts: () => Promise.resolve(accounts),
    syncOne: (account) =>
      account.id === 'a'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve<SyncOutcome>({ status: 'ok', fetched: 2, parsed: 1, unparsed: 1, pages: 1 }),
  });
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  let response: Response;
  try {
    response = await handler(req('s3cret'));
  } finally {
    console.error = original;
  }
  // Solo un texto fijo: ni el id de la cuenta ni el mensaje del error.
  assertEquals(logged, [['sync-mail: an account sync failed unexpectedly']]);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    accounts: 2,
    outcomes: [
      { accountId: 'a', status: 'error', fetched: 0, parsed: 0, unparsed: 0 },
      { accountId: 'b', status: 'ok', fetched: 2, parsed: 1, unparsed: 1 },
    ],
  });
});

Deno.test('a failing mark of an invalid-cursor row does not drop the valid accounts', async () => {
  const valid = JSON.stringify(cursor);
  const rows = [
    { id: 'bad1', user_id: 'u1', provider: 'outlook' as const, sync_cursor: 'garbage' },
    { id: 'a', user_id: 'u1', provider: 'outlook' as const, sync_cursor: valid },
    { id: 'bad2', user_id: 'u2', provider: 'outlook' as const, sync_cursor: null },
    { id: 'b', user_id: 'u2', provider: 'outlook' as const, sync_cursor: valid },
  ];
  const marked: string[] = [];
  const result = await toSyncAccounts(rows, (id) => {
    marked.push(id);
    return id === 'bad1' ? Promise.reject(new Error('db down')) : Promise.resolve();
  });
  assertEquals(result.map((a) => a.id), ['a', 'b']);
  assertEquals(marked, ['bad1', 'bad2']);
});

Deno.test('regression — a Gmail account whose provider is not configured is skipped visibly while Outlook still syncs', async () => {
  const { repo, logs, marks } = fakeRepo();
  const synced: string[] = [];
  const handler = createSyncMailHandler({
    secret: 's3cret',
    repo,
    now: () => new Date('2026-10-17T12:00:00Z'),
    isConfigured: (provider) => provider !== 'gmail',
    listActiveAccounts: () => Promise.resolve([{ id: 'g', userId: 'u1', provider: 'gmail', cursor }, { id: 'o', userId: 'u2', provider: 'outlook', cursor }]),
    syncOne: (account) => {
      synced.push(account.id);
      return Promise.resolve<SyncOutcome>({ status: 'ok', fetched: 1, parsed: 1, unparsed: 0, pages: 1 });
    },
  });
  const original = console.error;
  console.error = () => {};
  let response: Response;
  try {
    response = await handler(req('s3cret'));
  } finally {
    console.error = original;
  }
  assertEquals(synced, ['o']);
  assertEquals(logs, [{
    accountId: 'g', userId: 'u1', startedAt: '2026-10-17T12:00:00.000Z', finishedAt: '2026-10-17T12:00:00.000Z',
    fetched: 0, parsed: 0, unparsed: 0, error: 'provider not configured',
  }]);
  assertEquals(marks, [{
    accountId: 'g',
    state: { status: 'active', lastError: 'Gmail no está disponible por ahora. Se reintentará más tarde.', lastSyncAt: null },
  }]);
  assertEquals((await response.json()).outcomes.map((o: { accountId: string; status: string }) => [o.accountId, o.status]), [['g', 'error'], ['o', 'ok']]);
});

Deno.test('a failing skip record does not stop the other accounts', async () => {
  const synced: string[] = [];
  const handler = createSyncMailHandler({
    secret: 's3cret',
    repo: { logSync: () => Promise.reject(new Error('db down')), markAccount: () => Promise.resolve() },
    now: () => new Date(),
    isConfigured: (provider) => provider !== 'gmail',
    listActiveAccounts: () => Promise.resolve([{ id: 'g', userId: 'u1', provider: 'gmail', cursor }, { id: 'o', userId: 'u2', provider: 'outlook', cursor }]),
    syncOne: (account) => {
      synced.push(account.id);
      return Promise.resolve<SyncOutcome>({ status: 'ok', fetched: 0, parsed: 0, unparsed: 0, pages: 1 });
    },
  });
  const original = console.error;
  console.error = () => {};
  try {
    assertEquals((await handler(req('s3cret'))).status, 200);
  } finally {
    console.error = original;
  }
  assertEquals(synced, ['o']);
});

const okOutcome: SyncOutcome = { status: 'ok', fetched: 0, parsed: 0, unparsed: 0, pages: 0 };
const three: SyncAccount[] = [
  { id: 'a', userId: 'u1', provider: 'outlook', cursor },
  { id: 'b', userId: 'u2', provider: 'outlook', cursor },
  { id: 'c', userId: 'u3', provider: 'outlook', cursor },
];

Deno.test('regression — the run stops starting new accounts once its time budget is spent', async () => {
  let t = 0;
  const started: string[] = [];
  const handler = createSyncMailHandler({
    ...base,
    secret: 's',
    now: () => new Date(t),
    runBudgetMs: 1000,
    listActiveAccounts: () => Promise.resolve(three),
    syncOne: (account) => {
      started.push(account.id);
      t += 600;
      return Promise.resolve(okOutcome);
    },
  });
  const body = await (await handler(req('s'))).json();
  assertEquals(started, ['a', 'b']);
  assertEquals(body.outcomes.map((o: { accountId: string; status: string }) => [o.accountId, o.status]), [['a', 'ok'], ['b', 'ok'], ['c', 'skipped']]);
});

Deno.test('regression — each account receives the run deadline so it stops between pages', async () => {
  const deadlines: (number | undefined)[] = [];
  const handler = createSyncMailHandler({
    ...base,
    secret: 's',
    now: () => new Date(5_000),
    runBudgetMs: 1000,
    listActiveAccounts: () => Promise.resolve([three[0]]),
    syncOne: (_account, deadline) => (deadlines.push(deadline), Promise.resolve(okOutcome)),
  });
  await handler(req('s'));
  assertEquals(deadlines, [6_000]);
});

Deno.test('regression — accounts are synced in the injected order, not the database order', async () => {
  const started: string[] = [];
  const handler = createSyncMailHandler({
    ...base,
    secret: 's',
    order: (list) => [...list].reverse(),
    listActiveAccounts: () => Promise.resolve(three),
    syncOne: (account) => (started.push(account.id), Promise.resolve(okOutcome)),
  });
  await handler(req('s'));
  assertEquals(started, ['c', 'b', 'a']);
});

Deno.test('shuffled keeps every account exactly once', () => {
  const ids = Array.from({ length: 20 }, (_, i) => String(i));
  const random = [0.9, 0.1, 0.5, 0.3, 0.7];
  let k = 0;
  const result = shuffled(ids, () => random[k++ % random.length]);
  assertEquals([...result].sort(), [...ids].sort());
  assertEquals(ids, Array.from({ length: 20 }, (_, i) => String(i)));
});
