import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1';
import { exchangeCode, MS_SCOPES, MS_TOKEN_URL, refreshTokens } from './microsoft-auth.ts';
import { MailAuthError, MailTransientError, NoRefreshTokenError } from './types.ts';

function idToken(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(claims)}.sig`;
}

function fakeFetch(status: number, body: unknown, seen: { url?: string; form?: URLSearchParams } = {}): typeof fetch {
  return ((url: string, init?: RequestInit) => {
    seen.url = url;
    seen.form = new URLSearchParams(String(init?.body ?? ''));
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  }) as typeof fetch;
}

Deno.test('exchangeCode — posts a PKCE code exchange as a public client', async () => {
  const seen: { url?: string; form?: URLSearchParams } = {};
  const result = await exchangeCode(
    { clientId: 'client-1', code: 'the-code', codeVerifier: 'the-verifier', redirectUri: 'recibo://auth/microsoft' },
    fakeFetch(200, { refresh_token: 'rt-1', id_token: idToken({ email: 'Owner@Outlook.example' }) }, seen),
  );
  assertEquals(result, { refreshToken: 'rt-1', email: 'owner@outlook.example' });
  assertEquals(seen.url, MS_TOKEN_URL);
  assertStringIncludes(MS_SCOPES, 'Mail.Read');
  assertEquals(Object.fromEntries(seen.form ?? []), {
    client_id: 'client-1',
    grant_type: 'authorization_code',
    code: 'the-code',
    code_verifier: 'the-verifier',
    redirect_uri: 'recibo://auth/microsoft',
    scope: MS_SCOPES,
  });
});

Deno.test('exchangeCode — invalid_grant is an auth error that never leaks the code', async () => {
  const error = await assertRejects(
    () => exchangeCode({ clientId: 'c', code: 'the-code', codeVerifier: 'v', redirectUri: 'r' }, fakeFetch(400, { error: 'invalid_grant' })),
    MailAuthError,
  );
  assertEquals(error.message.includes('the-code'), false);
});

Deno.test('refreshTokens — returns the rotated refresh token, or keeps the old one if none comes back', async () => {
  assertEquals(await refreshTokens('c', 'rt-old', fakeFetch(200, { access_token: 'at', refresh_token: 'rt-new' })), {
    accessToken: 'at',
    refreshToken: 'rt-new',
  });
  assertEquals(await refreshTokens('c', 'rt-old', fakeFetch(200, { access_token: 'at' })), { accessToken: 'at', refreshToken: 'rt-old' });
});

Deno.test('refreshTokens — 503 is transient, invalid_grant is auth', async () => {
  await assertRejects(() => refreshTokens('c', 'rt', fakeFetch(503, {})), MailTransientError);
  await assertRejects(() => refreshTokens('c', 'rt', fakeFetch(400, { error: 'invalid_grant' })), MailAuthError);
});

Deno.test('exchangeCode — a response without refresh token is a NoRefreshTokenError', async () => {
  await assertRejects(
    () => exchangeCode({ clientId: 'c', code: 'k', codeVerifier: 'v', redirectUri: 'r' }, fakeFetch(200, { id_token: idToken({ email: 'a@b.example' }) })),
    NoRefreshTokenError,
  );
});
