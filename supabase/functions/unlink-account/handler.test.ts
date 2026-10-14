import { assertEquals } from 'jsr:@std/assert@1';
import { createUnlinkHandler } from './handler.ts';

const req = (payload: unknown, token = 'user-jwt') =>
  new Request('http://x/unlink-account', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });

const deps = (unlinked: boolean) => ({
  userIdFromToken: (t: string) => Promise.resolve(t === 'user-jwt' ? 'user-1' : null),
  unlink: (_userId: string, _accountId: string) => Promise.resolve(unlinked),
});

Deno.test('unlinks an account of the signed-in user', async () => {
  const response = await createUnlinkHandler(deps(true))(req({ accountId: 'acc-1' }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { ok: true });
});

Deno.test('404 when the account does not exist or belongs to someone else', async () => {
  assertEquals((await createUnlinkHandler(deps(false))(req({ accountId: 'acc-9' }))).status, 404);
});

Deno.test('401 without session, 400 without accountId', async () => {
  assertEquals((await createUnlinkHandler(deps(true))(req({ accountId: 'acc-1' }, 'bad'))).status, 401);
  assertEquals((await createUnlinkHandler(deps(true))(req({}))).status, 400);
});
