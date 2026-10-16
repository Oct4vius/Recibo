import { assertEquals } from 'jsr:@std/assert@1';
import { gmailExchanger, GMAIL_MESSAGES, OUTLOOK_MESSAGES, outlookExchanger } from './exchangers.ts';

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

Deno.test('outlookExchanger — needs code, codeVerifier and redirectUri', () => {
  const ex = outlookExchanger('ms', fakeFetch(200, {}));
  assertEquals(ex.prepare({ provider: 'outlook', code: 'c', redirectUri: 'r' }), null);
  assertEquals(ex.prepare({ provider: 'outlook', code: '', codeVerifier: 'v', redirectUri: 'r' }), null);
  assertEquals(typeof ex.prepare({ provider: 'outlook', code: 'c', codeVerifier: 'v', redirectUri: 'r' }), 'function');
  assertEquals(ex.messages, OUTLOOK_MESSAGES);
});

Deno.test('gmailExchanger — the SDK code goes with an empty redirect_uri and the web client secret', async () => {
  const seen: { url?: string; form?: URLSearchParams } = {};
  const run = gmailExchanger(
    { clientId: 'g', clientSecret: 's' },
    fakeFetch(200, { refresh_token: 'rt', scope: GRANTED, id_token: idToken({ email: 'a@gmail.example' }) }, seen),
  ).prepare({ provider: 'gmail', code: 'sdk-code' });
  assertEquals(await run!(), { refreshToken: 'rt', email: 'a@gmail.example' });
  assertEquals(seen.form?.get('redirect_uri'), '');
  assertEquals(seen.form?.get('client_secret'), 's');
});

Deno.test('gmailExchanger — the terminal script sends its loopback redirect; invalid bodies are null', () => {
  const ex = gmailExchanger({ clientId: 'g', clientSecret: 's' }, fakeFetch(200, {}));
  assertEquals(typeof ex.prepare({ provider: 'gmail', code: 'c', redirectUri: 'http://localhost:53682/callback' }), 'function');
  assertEquals(ex.prepare({ provider: 'gmail', code: 'c', redirectUri: 5 }), null);
  assertEquals(ex.prepare({ provider: 'gmail' }), null);
  assertEquals(ex.messages, GMAIL_MESSAGES);
});
