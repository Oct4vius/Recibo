import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1';
import { createGmailProvider, decodePartText, type GmailMessage, type GmailPart, listUrl, toRawEmail } from './gmail.ts';
import { MailAuthError, MailTransientError, type SyncCursor } from './types.ts';

const cursor: SyncCursor = { since: '2026-09-01T04:00:00Z', next: null, maxSeen: null };
const ADDR = ['alertas@bhd.com.do'];

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function message(id: string, internalDateMs: number): GmailMessage {
  return {
    id,
    internalDate: String(internalDateMs),
    payload: {
      mimeType: 'text/html',
      headers: [
        { name: 'From', value: 'Alertas@bhd.com.do' },
        { name: 'Subject', value: 'BHD Notificación de Transacciones' },
      ],
      body: { data: b64url('<table><tr><td>Fecha</td><td>Monto</td></tr></table>') },
    },
  };
}

interface Reply {
  status: number;
  body?: unknown;
}
type Seen = { url: string; headers: Headers }[];

/** Responde según la URL; registra cada llamada. */
function gmailFetch(route: (url: string) => Reply, seen: Seen): typeof fetch {
  return ((url: string, init?: RequestInit) => {
    seen.push({ url, headers: new Headers(init?.headers) });
    const reply = route(url);
    return Promise.resolve(new Response(JSON.stringify(reply.body ?? {}), { status: reply.status }));
  }) as typeof fetch;
}

function providerWith(route: (url: string) => Reply, seen: Seen = []) {
  return createGmailProvider({ clientId: 'c', clientSecret: 's', addresses: ADDR, fetchImpl: gmailFetch(route, seen) });
}

const isList = (url: string) => !url.includes('/messages/');

Deno.test('listUrl — exact senders since the cursor minus the overlap, spam and trash included, 50 per page', () => {
  const url = new URL(listUrl(ADDR, cursor));
  assertEquals(url.origin + url.pathname, 'https://gmail.googleapis.com/gmail/v1/users/me/messages');
  assertEquals(url.searchParams.get('q'), 'from:(alertas@bhd.com.do) after:1788234600');
  assertEquals(url.searchParams.get('includeSpamTrash'), 'true');
  assertEquals(url.searchParams.get('maxResults'), '50');
  assertEquals(url.searchParams.has('pageToken'), false);
  assertEquals(new URL(listUrl(ADDR, { ...cursor, next: 'tok-2' })).searchParams.get('pageToken'), 'tok-2');
});

Deno.test('toRawEmail — nested multipart: finds the HTML part depth-first and uses internalDate', () => {
  const raw = toRawEmail({
    id: '18f2a',
    internalDate: '1789526595000',
    payload: {
      mimeType: 'multipart/related',
      headers: [
        { name: 'From', value: 'BHD <Alertas@bhd.com.do>' },
        { name: 'subject', value: 'BHD Notificación de Transacciones' },
      ],
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: b64url('plano') } },
            {
              mimeType: 'text/html',
              headers: [{ name: 'Content-Type', value: 'text/html; charset=UTF-8' }],
              body: { data: b64url('<table><tr><td>Fecha</td><td>Monto</td></tr></table>') },
            },
          ],
        },
        { mimeType: 'image/png', body: {} },
      ],
    },
  });
  assertEquals(raw, {
    messageId: '18f2a',
    from: 'Alertas@bhd.com.do',
    subject: 'BHD Notificación de Transacciones',
    text: 'Fecha | Monto',
    receivedAt: '2026-09-16T02:43:15.000Z',
  });
});

Deno.test('toRawEmail — a single-part text/html payload is read from the root', () => {
  const raw = toRawEmail({
    id: 'single',
    internalDate: '1789526595000',
    payload: {
      mimeType: 'text/html',
      headers: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }],
      body: { data: b64url('<p>Monto</p><p>RD$ 200</p>') },
    },
  });
  assertEquals(raw.text, 'Monto\nRD$ 200');
});

Deno.test('toRawEmail — without an HTML part the text is empty (falls to unparsed downstream)', () => {
  const raw = toRawEmail({
    id: 'x',
    internalDate: '1789526595000',
    payload: { mimeType: 'text/plain', headers: [], body: { data: b64url('hola') } },
  });
  assertEquals(raw.text, '');
});

Deno.test('regression — an ISO-8859-1 HTML part keeps its accents; an unknown charset falls back to UTF-8', () => {
  // <p>Notificación</p> en Latin-1
  const latin1 = new Uint8Array([0x3c, 0x70, 0x3e, 0x4e, 0x6f, 0x74, 0x69, 0x66, 0x69, 0x63, 0x61, 0x63, 0x69, 0xf3, 0x6e, 0x3c, 0x2f, 0x70, 0x3e]);
  const part = (charset: string, data: string): GmailPart => ({
    mimeType: 'text/html',
    headers: [{ name: 'Content-Type', value: `text/html; charset="${charset}"` }],
    body: { data },
  });
  assertEquals(decodePartText(part('ISO-8859-1', b64url(latin1))), '<p>Notificación</p>');
  assertEquals(decodePartText(part('x-desconocido', b64url('<p>Notificación</p>'))), '<p>Notificación</p>');
});

Deno.test('fetchNew — lists, gets each id with format=full, keeps list order and pages newest-first', async () => {
  const seen: Seen = [];
  const provider = providerWith((url) => {
    if (isList(url)) return { status: 200, body: { messages: [{ id: 'new' }, { id: 'old' }], nextPageToken: 'tok-2' } };
    return { status: 200, body: message(url.includes('/new?') ? 'new' : 'old', Date.parse(url.includes('/new?') ? '2026-09-20T10:00:00Z' : '2026-09-18T10:00:00Z')) };
  }, seen);
  const page = await provider.fetchNew('at', cursor);
  assertEquals(page.emails.map((e) => e.messageId), ['new', 'old']);
  assertEquals(page.cursor, { since: cursor.since, next: 'tok-2', maxSeen: '2026-09-20T10:00:00.000Z' });
  assertEquals(page.hasMore, true);
  assertStringIncludes(seen[1].url, '/messages/new?format=full');
  assertEquals(seen.every((s) => s.headers.get('Authorization') === 'Bearer at'), true);
});

Deno.test('fetchNew — an empty mailbox (no messages key) makes no get calls and keeps the cursor', async () => {
  const seen: Seen = [];
  const page = await providerWith(() => ({ status: 200, body: {} }), seen).fetchNew('at', cursor);
  assertEquals(seen.length, 1);
  assertEquals(page, { emails: [], cursor, hasMore: false });
});

Deno.test('regression — a message deleted between list and get (404) is skipped, not fatal', async () => {
  const provider = providerWith((url) => {
    if (isList(url)) return { status: 200, body: { messages: [{ id: 'gone' }, { id: 'ok' }] } };
    if (url.includes('/gone?')) return { status: 404 };
    return { status: 200, body: message('ok', Date.parse('2026-09-20T10:00:00Z')) };
  });
  const page = await provider.fetchNew('at', cursor);
  assertEquals(page.emails.map((e) => e.messageId), ['ok']);
});

Deno.test('fetchNew — a stale pageToken restarts the query from since', async () => {
  const seen: Seen = [];
  const provider = providerWith((url) => (new URL(url).searchParams.has('pageToken') ? { status: 400 } : { status: 200, body: {} }), seen);
  const page = await provider.fetchNew('at', { ...cursor, next: 'stale', maxSeen: '2026-09-10T00:00:00Z' });
  assertEquals(new URL(seen[0].url).searchParams.get('pageToken'), 'stale');
  assertEquals(new URL(seen[1].url).searchParams.has('pageToken'), false);
  assertEquals(page.cursor, cursor);
});

Deno.test('fetchNew — 401 and 403 insufficientPermissions are auth; 403 rate limits, 429, 5xx, network and non-JSON are transient', async () => {
  const make = (reply: Reply) => providerWith(() => reply);
  const makeRaw = (fn: () => Promise<Response>) =>
    createGmailProvider({ clientId: 'c', clientSecret: 's', addresses: ADDR, fetchImpl: (() => fn()) as typeof fetch });
  await assertRejects(() => make({ status: 401 }).fetchNew('at', cursor), MailAuthError);
  await assertRejects(() => make({ status: 403, body: { error: { errors: [{ reason: 'insufficientPermissions' }] } } }).fetchNew('at', cursor), MailAuthError);
  await assertRejects(() => make({ status: 403, body: { error: { errors: [{ reason: 'userRateLimitExceeded' }] } } }).fetchNew('at', cursor), MailTransientError);
  await assertRejects(() => make({ status: 403, body: { error: { errors: [{ reason: 'rateLimitExceeded' }] } } }).fetchNew('at', cursor), MailTransientError);
  await assertRejects(() => make({ status: 403, body: {} }).fetchNew('at', cursor), Error, 'gmail 403');
  await assertRejects(() => make({ status: 429 }).fetchNew('at', cursor), MailTransientError);
  await assertRejects(() => make({ status: 503 }).fetchNew('at', cursor), MailTransientError);
  await assertRejects(() => makeRaw(() => Promise.reject(new TypeError('net'))).fetchNew('at', cursor), MailTransientError);
  await assertRejects(() => makeRaw(() => Promise.resolve(new Response('<html>', { status: 200 }))).fetchNew('at', cursor), MailTransientError);
});

Deno.test('fetchNew — a get that fails with 5xx is transient (no partial page)', async () => {
  const provider = providerWith((url) => (isList(url) ? { status: 200, body: { messages: [{ id: 'a' }] } } : { status: 500 }));
  await assertRejects(() => provider.fetchNew('at', cursor), MailTransientError);
});

Deno.test('refreshToken — delegates to the Google token endpoint with the web client', async () => {
  const seen: { form?: URLSearchParams }[] = [];
  const provider = createGmailProvider({
    clientId: 'web-id',
    clientSecret: 'web-secret',
    addresses: ADDR,
    fetchImpl: ((_url: string, init?: RequestInit) => {
      seen.push({ form: new URLSearchParams(String(init?.body ?? '')) });
      return Promise.resolve(new Response(JSON.stringify({ access_token: 'at' }), { status: 200 }));
    }) as typeof fetch,
  });
  assertEquals(await provider.refreshToken('rt'), { accessToken: 'at', refreshToken: 'rt' });
  assertEquals(seen[0].form?.get('client_id'), 'web-id');
  assertEquals(seen[0].form?.get('client_secret'), 'web-secret');
});
