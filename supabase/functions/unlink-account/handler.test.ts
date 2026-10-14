import { assertEquals } from 'jsr:@std/assert@1';
import { createUnlinkHandler } from './handler.ts';

const ACC_1 = '11111111-1111-4111-8111-111111111111';
const ACC_9 = '99999999-9999-4999-8999-999999999999';
const req = (payload: unknown, token = 'user-jwt') =>
  new Request('http://x/unlink-account', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });

const deps = (unlinked: boolean) => ({
  userIdFromToken: (t: string) => Promise.resolve(t === 'user-jwt' ? 'user-1' : null),
  unlink: (_userId: string, _accountId: string) => Promise.resolve(unlinked),
});

Deno.test('unlinks an account of the signed-in user', async () => {
  const response = await createUnlinkHandler(deps(true))(req({ accountId: ACC_1 }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { ok: true });
});

Deno.test('404 when the account does not exist or belongs to someone else', async () => {
  assertEquals((await createUnlinkHandler(deps(false))(req({ accountId: ACC_9 }))).status, 404);
});

Deno.test('401 without session, 400 without accountId', async () => {
  assertEquals((await createUnlinkHandler(deps(true))(req({ accountId: ACC_1 }, 'bad'))).status, 401);
  assertEquals((await createUnlinkHandler(deps(true))(req({}))).status, 400);
});

Deno.test('a non-uuid accountId is a 400 and never reaches unlink', async () => {
  let called = false;
  const d = { ...deps(true), unlink: () => { called = true; return Promise.resolve(true); } };
  assertEquals((await createUnlinkHandler(d)(req({ accountId: 'abc' }))).status, 400);
  assertEquals(called, false);
});

Deno.test('a failing unlink is a 502 JSON error', async () => {
  const d = { ...deps(true), unlink: () => Promise.reject(new Error('db down')) };
  const response = await createUnlinkHandler(d)(req({ accountId: ACC_1 }));
  assertEquals(response.status, 502);
  assertEquals(await response.json(), { error: 'No se pudo desvincular la cuenta. Intenta de nuevo.' });
});
