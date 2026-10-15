import { assertEquals } from 'jsr:@std/assert@1';
import type { SyncAccount } from '../_shared/sync/repository.ts';
import type { SyncOutcome } from '../_shared/sync/sync-account.ts';
import { createSyncMailHandler, toSyncAccounts } from './handler.ts';

const cursor = { since: '2026-09-01T04:00:00Z', next: null, maxSeen: null };
const accounts: SyncAccount[] = [
  { id: 'a', userId: 'u1', provider: 'outlook', cursor },
  { id: 'b', userId: 'u2', provider: 'outlook', cursor },
];
const req = (token: string) => new Request('http://x/sync-mail', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

Deno.test('only the cron secret can trigger a sync', async () => {
  const handler = createSyncMailHandler({ secret: 's3cret', listActiveAccounts: () => Promise.resolve(accounts), syncOne: () => Promise.reject(new Error('unreachable')) });
  assertEquals((await handler(req('wrong'))).status, 401);
});

Deno.test('one failing account does not stop the others', async () => {
  const handler = createSyncMailHandler({
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
