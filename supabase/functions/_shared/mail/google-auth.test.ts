import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  exchangeGoogleCode,
  GOOGLE_REVOKE_URL,
  GOOGLE_TOKEN_URL,
  refreshGoogleTokens,
  revokeGoogleToken,
} from './google-auth.ts';
import { MailAuthError, MailTransientError, MissingScopeError, NoRefreshTokenError } from './types.ts';

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

const GRANTED = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly';

Deno.test('exchangeGoogleCode — exchanges the SDK code with the web client secret and an empty redirect_uri', async () => {
  const seen: { url?: string; form?: URLSearchParams } = {};
  const result = await exchangeGoogleCode(
    { clientId: 'web-id', clientSecret: 'web-secret', code: 'the-code', redirectUri: '' },
    fakeFetch(200, { refresh_token: 'rt-1', scope: GRANTED, id_token: idToken({ email: 'Pareja@Gmail.example' }) }, seen),
  );
  assertEquals(result, { refreshToken: 'rt-1', email: 'pareja@gmail.example' });
  assertEquals(seen.url, GOOGLE_TOKEN_URL);
  assertEquals(Object.fromEntries(seen.form ?? []), {
    client_id: 'web-id',
    client_secret: 'web-secret',
    grant_type: 'authorization_code',
    code: 'the-code',
    redirect_uri: '',
  });
});

Deno.test('exchangeGoogleCode — a consent without the Gmail checkbox is a MissingScopeError', async () => {
  await assertRejects(
    () =>
      exchangeGoogleCode(
        { clientId: 'c', clientSecret: 's', code: 'k', redirectUri: '' },
        fakeFetch(200, {
          refresh_token: 'rt',
          scope: 'openid https://www.googleapis.com/auth/userinfo.email',
          id_token: idToken({ email: 'a@b.example' }),
        }),
      ),
    MissingScopeError,
  );
});

Deno.test('exchangeGoogleCode — no refresh token (already consented) is a NoRefreshTokenError', async () => {
  await assertRejects(
    () =>
      exchangeGoogleCode(
        { clientId: 'c', clientSecret: 's', code: 'k', redirectUri: '' },
        fakeFetch(200, { scope: GRANTED, id_token: idToken({ email: 'a@b.example' }) }),
      ),
    NoRefreshTokenError,
  );
});

Deno.test('exchangeGoogleCode — invalid_grant is auth and never leaks the code or the secret', async () => {
  const error = await assertRejects(
    () =>
      exchangeGoogleCode(
        { clientId: 'c', clientSecret: 'the-secret', code: 'the-code', redirectUri: '' },
        fakeFetch(400, { error: 'invalid_grant' }),
      ),
    MailAuthError,
  );
  assertEquals(error.message.includes('the-code') || error.message.includes('the-secret'), false);
});

Deno.test('exchangeGoogleCode — a response without email is an incomplete response', async () => {
  await assertRejects(
    () =>
      exchangeGoogleCode(
        { clientId: 'c', clientSecret: 's', code: 'k', redirectUri: '' },
        fakeFetch(200, { refresh_token: 'rt', scope: GRANTED }),
      ),
    Error,
    'incomplete token response',
  );
});

Deno.test('refreshGoogleTokens — keeps the same refresh token when Google does not rotate it', async () => {
  const seen: { url?: string; form?: URLSearchParams } = {};
  assertEquals(await refreshGoogleTokens('c', 's', 'rt-old', fakeFetch(200, { access_token: 'at' }, seen)), {
    accessToken: 'at',
    refreshToken: 'rt-old',
  });
  assertEquals(Object.fromEntries(seen.form ?? []), {
    client_id: 'c',
    client_secret: 's',
    grant_type: 'refresh_token',
    refresh_token: 'rt-old',
  });
  assertEquals(await refreshGoogleTokens('c', 's', 'rt-old', fakeFetch(200, { access_token: 'at', refresh_token: 'rt-new' })), {
    accessToken: 'at',
    refreshToken: 'rt-new',
  });
});

Deno.test('refreshGoogleTokens — invalid_grant is auth, 503 is transient', async () => {
  await assertRejects(() => refreshGoogleTokens('c', 's', 'rt', fakeFetch(400, { error: 'invalid_grant' })), MailAuthError);
  await assertRejects(() => refreshGoogleTokens('c', 's', 'rt', fakeFetch(503, {})), MailTransientError);
});

Deno.test('revokeGoogleToken — posts the token to the revoke endpoint', async () => {
  const seen: { url?: string; form?: URLSearchParams } = {};
  await revokeGoogleToken('rt-1', fakeFetch(200, {}, seen));
  assertEquals(seen.url, GOOGLE_REVOKE_URL);
  assertEquals(Object.fromEntries(seen.form ?? []), { token: 'rt-1' });
});

Deno.test('revokeGoogleToken — a 400 (token already dead) rejects without the token in the message', async () => {
  const error = await assertRejects(() => revokeGoogleToken('rt-secret', fakeFetch(400, { error: 'invalid_token' })), Error);
  assertEquals(error.message.includes('rt-secret'), false);
});

Deno.test('revokeGoogleToken — a hanging endpoint is aborted after the timeout', async () => {
  const hanging = ((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) =>
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    )) as typeof fetch;
  await assertRejects(() => revokeGoogleToken('rt', hanging, 10));
});
