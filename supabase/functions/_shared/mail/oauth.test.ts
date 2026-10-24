import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { emailFromIdToken, postTokenForm } from './oauth.ts';
import { MailAuthError, MailTransientError } from './types.ts';

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

Deno.test('emailFromIdToken — prefers email, falls back to preferred_username, rejects garbage', () => {
  assertEquals(emailFromIdToken(idToken({ email: 'A@B.example', preferred_username: 'x@y.example' })), 'a@b.example');
  assertEquals(emailFromIdToken(idToken({ preferred_username: 'X@Y.example' })), 'x@y.example');
  assertEquals(emailFromIdToken('nope'), null);
  assertEquals(emailFromIdToken(idToken({ email: 'no-at-sign' })), null);
});

Deno.test('postTokenForm — posts a form and returns the JSON body', async () => {
  const seen: { url?: string; form?: URLSearchParams } = {};
  const json = await postTokenForm('https://token.example/t', { a: '1', b: 'x y' }, fakeFetch(200, { access_token: 'at' }, seen));
  assertEquals(json, { access_token: 'at' });
  assertEquals(seen.url, 'https://token.example/t');
  assertEquals(Object.fromEntries(seen.form ?? []), { a: '1', b: 'x y' });
});

Deno.test('postTokenForm — unreachable endpoint is transient and the error never includes the params', async () => {
  const failing = (() => Promise.reject(new TypeError('dns'))) as typeof fetch;
  const error = await assertRejects(() => postTokenForm('https://token.example/t', { code: 'the-code' }, failing), MailTransientError);
  assertEquals(error.message.includes('the-code'), false);
});

Deno.test('postTokenForm — 503 transient, invalid_grant auth, other errors generic', async () => {
  await assertRejects(() => postTokenForm('u', {}, fakeFetch(503, {})), MailTransientError);
  await assertRejects(() => postTokenForm('u', {}, fakeFetch(400, { error: 'invalid_grant' })), MailAuthError);
  await assertRejects(() => postTokenForm('u', {}, fakeFetch(400, { error: 'invalid_client' })), Error, 'token endpoint error: invalid_client');
});

Deno.test('regression — the token request carries a timeout so a hung endpoint cannot hold the whole sync run', async () => {
  let signal: AbortSignal | null | undefined;
  const capture = ((_url: string, init?: RequestInit) => {
    signal = init?.signal;
    return Promise.resolve(new Response('{}', { status: 200 }));
  }) as typeof fetch;
  await postTokenForm('u', {}, capture);
  assertEquals(signal instanceof AbortSignal, true);
});

Deno.test('regression — a 200 whose body cannot be read (timeout mid-body) is transient', async () => {
  const brokenBody = (() => Promise.resolve(new Response('{"access_tok', { status: 200 }))) as typeof fetch;
  await assertRejects(() => postTokenForm('u', {}, brokenBody), MailTransientError);
});

