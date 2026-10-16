import { assertEquals } from 'jsr:@std/assert@1';
import { MailAuthError, MissingScopeError, NoRefreshTokenError } from '../_shared/mail/types.ts';
import { GMAIL_LINK_MESSAGES, OUTLOOK_LINK_MESSAGES } from './exchangers.ts';
import { type CodeExchanger, createLinkHandler, type LinkDeps, type LinkedTokens } from './handler.ts';

const body = { provider: 'outlook', code: 'the-code', codeVerifier: 'the-verifier', redirectUri: 'recibo://auth/microsoft' };
const LINK_FAILED = { error: 'No se pudo vincular la cuenta. Intenta de nuevo.' };

function request(payload: unknown, token: string | null = 'user-jwt'): Request {
  return new Request('http://x/link-account', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

const fakeExchanger = (result: () => Promise<LinkedTokens>, seen: unknown[], messages = OUTLOOK_LINK_MESSAGES): CodeExchanger => ({
  messages,
  prepare: (b) => (typeof b.code === 'string' ? () => (seen.push(b), result()) : null),
});

const ok = (email: string) => () => Promise.resolve({ refreshToken: 'rt', email });

function deps(
  overrides: Partial<LinkDeps> & { gmail?: () => Promise<LinkedTokens> } = {},
): LinkDeps & { linked: unknown[]; exchanged: unknown[] } {
  const linked: unknown[] = [];
  const exchanged: unknown[] = [];
  const { gmail, ...rest } = overrides;
  return {
    linked,
    exchanged,
    userIdFromToken: (t) => Promise.resolve(t === 'user-jwt' ? 'user-1' : null),
    exchangers: {
      outlook: fakeExchanger(ok('owner@outlook.example'), exchanged),
      gmail: fakeExchanger(gmail ?? ok('pareja@gmail.example'), exchanged, GMAIL_LINK_MESSAGES),
    },
    linkAccount: (userId, provider, email, refreshToken) => {
      linked.push({ userId, provider, email, refreshToken });
      return Promise.resolve('acc-1');
    },
    ...rest,
  };
}

Deno.test('links the account of the signed-in user and never returns tokens', async () => {
  const d = deps();
  const response = await createLinkHandler(d)(request(body));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { accountId: 'acc-1', email: 'owner@outlook.example' });
  assertEquals(d.exchanged, [body]);
  assertEquals(d.linked, [{ userId: 'user-1', provider: 'outlook', email: 'owner@outlook.example', refreshToken: 'rt' }]);
});

Deno.test('links a Gmail account with provider gmail', async () => {
  const d = deps();
  const response = await createLinkHandler(d)(request({ provider: 'gmail', code: 'sdk-code' }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { accountId: 'acc-1', email: 'pareja@gmail.example' });
  assertEquals((d.linked[0] as { provider: string }).provider, 'gmail');
});

Deno.test('rejects requests without a valid session', async () => {
  assertEquals((await createLinkHandler(deps())(request(body, null))).status, 401);
  assertEquals((await createLinkHandler(deps())(request(body, 'bad'))).status, 401);
});

Deno.test('rejects unknown providers, prototype keys and bodies the exchanger refuses', async () => {
  for (const provider of ['yahoo', 'constructor', '__proto__', 'toString', 42]) {
    assertEquals((await createLinkHandler(deps())(request({ ...body, provider }))).status, 400);
  }
  assertEquals((await createLinkHandler(deps())(request({ provider: 'outlook' }))).status, 400);
});

Deno.test('an expired or reused code is a 400 with the provider message', async () => {
  const response = await createLinkHandler(deps({ gmail: () => Promise.reject(new MailAuthError('invalid_grant')) }))(
    request({ provider: 'gmail', code: 'c' }),
  );
  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: GMAIL_LINK_MESSAGES.codeExpired });
});

Deno.test('a Google consent without refresh token or without the Gmail scope is a 400 with a clear message', async () => {
  const noRefresh = await createLinkHandler(deps({ gmail: () => Promise.reject(new NoRefreshTokenError('x')) }))(
    request({ provider: 'gmail', code: 'c' }),
  );
  assertEquals(noRefresh.status, 400);
  assertEquals(await noRefresh.json(), { error: GMAIL_LINK_MESSAGES.noRefreshToken });
  const noScope = await createLinkHandler(deps({ gmail: () => Promise.reject(new MissingScopeError('x')) }))(
    request({ provider: 'gmail', code: 'c' }),
  );
  assertEquals(noScope.status, 400);
  assertEquals(await noScope.json(), { error: GMAIL_LINK_MESSAGES.missingScope });
});

Deno.test('any other failure is a 502 without details', async () => {
  const response = await createLinkHandler(deps({ linkAccount: () => Promise.reject(new Error('db down')) }))(request(body));
  assertEquals(response.status, 502);
  assertEquals(await response.json(), LINK_FAILED);
});

Deno.test('regression — without a Gmail exchanger (no Google configuration) Gmail is a 400 and Outlook still links', async () => {
  const d = deps();
  const outlookOnly = { ...d, exchangers: { outlook: d.exchangers.outlook } };
  assertEquals((await createLinkHandler(outlookOnly)(request({ provider: 'gmail', code: 'c' }))).status, 400);
  assertEquals((await createLinkHandler(outlookOnly)(request(body))).status, 200);
});
