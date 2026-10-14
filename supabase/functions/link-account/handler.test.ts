import { assertEquals } from 'jsr:@std/assert@1';
import { MailAuthError } from '../_shared/mail/types.ts';
import { createLinkHandler, type LinkDeps } from './handler.ts';

const body = { provider: 'outlook', code: 'the-code', codeVerifier: 'the-verifier', redirectUri: 'recibo://auth/microsoft' };

function request(payload: unknown, token: string | null = 'user-jwt'): Request {
  return new Request('http://x/link-account', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

function deps(overrides: Partial<LinkDeps> = {}): LinkDeps & { linked: unknown[]; exchanged: unknown[] } {
  const linked: unknown[] = [];
  const exchanged: unknown[] = [];
  return {
    linked,
    exchanged,
    userIdFromToken: (t) => Promise.resolve(t === 'user-jwt' ? 'user-1' : null),
    exchangeCode: (input) => {
      exchanged.push(input);
      return Promise.resolve({ refreshToken: 'rt', email: 'owner@outlook.example' });
    },
    linkAccount: (userId, email, refreshToken) => {
      linked.push({ userId, email, refreshToken });
      return Promise.resolve('acc-1');
    },
    ...overrides,
  };
}

Deno.test('links the account of the signed-in user and never returns tokens', async () => {
  const d = deps();
  const response = await createLinkHandler(d)(request(body));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { accountId: 'acc-1', email: 'owner@outlook.example' });
  assertEquals(d.exchanged, [{ code: 'the-code', codeVerifier: 'the-verifier', redirectUri: 'recibo://auth/microsoft' }]);
  assertEquals(d.linked, [{ userId: 'user-1', email: 'owner@outlook.example', refreshToken: 'rt' }]);
});

Deno.test('rejects requests without a valid session', async () => {
  assertEquals((await createLinkHandler(deps())(request(body, null))).status, 401);
  assertEquals((await createLinkHandler(deps())(request(body, 'bad'))).status, 401);
});

Deno.test('rejects malformed bodies and unsupported providers', async () => {
  assertEquals((await createLinkHandler(deps())(request({ ...body, provider: 'gmail' }))).status, 400);
  assertEquals((await createLinkHandler(deps())(request({ provider: 'outlook' }))).status, 400);
});

Deno.test('an expired or reused code is a 400 with a Spanish message', async () => {
  const response = await createLinkHandler(deps({ exchangeCode: () => Promise.reject(new MailAuthError('invalid_grant')) }))(request(body));
  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: 'El código de Microsoft venció o ya se usó. Vuelve a intentarlo.' });
});

Deno.test('any other failure is a 502 without details', async () => {
  const response = await createLinkHandler(deps({ linkAccount: () => Promise.reject(new Error('db down')) }))(request(body));
  assertEquals(response.status, 502);
  assertEquals(await response.json(), { error: 'No se pudo vincular la cuenta. Intenta de nuevo.' });
});
