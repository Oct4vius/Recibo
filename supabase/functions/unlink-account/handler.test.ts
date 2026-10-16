import { assertEquals } from 'jsr:@std/assert@1';
import type { MailProviderName } from '../_shared/mail/types.ts';
import { createUnlinkHandler, type UnlinkDeps } from './handler.ts';

const ACC_1 = '11111111-1111-4111-8111-111111111111';
const ACC_9 = '99999999-9999-4999-8999-999999999999';
const req = (payload: unknown, token = 'user-jwt') =>
  new Request('http://x/unlink-account', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });

interface Setup {
  provider?: MailProviderName | null;
  token?: string | null | Error;
  revoke?: (token: string) => Promise<void>;
  unlinked?: boolean;
}

function deps(setup: Setup = {}): UnlinkDeps & { calls: string[] } {
  const calls: string[] = [];
  const provider = setup.provider === undefined ? 'gmail' : setup.provider;
  const token = setup.token === undefined ? 'rt-1' : setup.token;
  return {
    calls,
    userIdFromToken: (t) => Promise.resolve(t === 'user-jwt' ? 'user-1' : null),
    findAccount: () => (calls.push('find'), Promise.resolve(provider ? { provider } : null)),
    readToken: () => (calls.push('read'), token instanceof Error ? Promise.reject(token) : Promise.resolve(token)),
    revokers: {
      gmail: (t) => (calls.push(`revoke:${t}`), setup.revoke ? setup.revoke(t) : Promise.resolve()),
    },
    unlink: () => (calls.push('unlink'), Promise.resolve(setup.unlinked ?? true)),
  };
}

Deno.test('unlinking Gmail revokes the token in Google before deleting the secret', async () => {
  const d = deps();
  const response = await createUnlinkHandler(d)(req({ accountId: ACC_1 }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { ok: true });
  assertEquals(d.calls, ['find', 'read', 'revoke:rt-1', 'unlink']);
});

Deno.test('a failing or hanging Google revocation still unlinks', async () => {
  const d = deps({ revoke: () => Promise.reject(new Error('google down')) });
  assertEquals((await createUnlinkHandler(d)(req({ accountId: ACC_1 }))).status, 200);
  assertEquals(d.calls.at(-1), 'unlink');
});

Deno.test('a failing token read still unlinks without revoking', async () => {
  const d = deps({ token: new Error('vault down') });
  assertEquals((await createUnlinkHandler(d)(req({ accountId: ACC_1 }))).status, 200);
  assertEquals(d.calls.some((c) => c.startsWith('revoke:')), false);
  assertEquals(d.calls.at(-1), 'unlink');
});

Deno.test('an account without token (error status) is unlinked without revoking', async () => {
  const d = deps({ token: null });
  assertEquals((await createUnlinkHandler(d)(req({ accountId: ACC_1 }))).status, 200);
  assertEquals(d.calls, ['find', 'read', 'unlink']);
});

Deno.test('Outlook has no revoker: the token is never read', async () => {
  const d = deps({ provider: 'outlook' });
  assertEquals((await createUnlinkHandler(d)(req({ accountId: ACC_1 }))).status, 200);
  assertEquals(d.calls, ['find', 'unlink']);
});

Deno.test("regression — another user's account is a 404 and its token is never read or revoked", async () => {
  const d = deps({ provider: null });
  assertEquals((await createUnlinkHandler(d)(req({ accountId: ACC_9 }))).status, 404);
  assertEquals(d.calls, ['find']);
});

Deno.test('404 when unlink finds nothing to revoke', async () => {
  assertEquals((await createUnlinkHandler(deps({ unlinked: false }))(req({ accountId: ACC_9 }))).status, 404);
});

Deno.test('401 without session, 400 without accountId', async () => {
  assertEquals((await createUnlinkHandler(deps())(req({ accountId: ACC_1 }, 'bad'))).status, 401);
  assertEquals((await createUnlinkHandler(deps())(req({}))).status, 400);
});

Deno.test('a non-uuid accountId is a 400 and never reaches findAccount', async () => {
  const d = deps();
  assertEquals((await createUnlinkHandler(d)(req({ accountId: 'abc' }))).status, 400);
  assertEquals(d.calls, []);
});

Deno.test('a failing unlink is a 502 JSON error', async () => {
  const d = { ...deps(), unlink: () => Promise.reject(new Error('db down')) };
  const response = await createUnlinkHandler(d)(req({ accountId: ACC_1 }));
  assertEquals(response.status, 502);
  assertEquals(await response.json(), { error: 'No se pudo desvincular la cuenta. Intenta de nuevo.' });
});

Deno.test('a failing findAccount is a 502 JSON error', async () => {
  const d = { ...deps(), findAccount: () => Promise.reject(new Error('db down')) };
  assertEquals((await createUnlinkHandler(d)(req({ accountId: ACC_1 }))).status, 502);
});
