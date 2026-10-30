import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1';
import { createGraphProvider, firstPageUrl, toRawEmail } from './graph.ts';
import { MailAuthError, MailTransientError, type SyncCursor } from './types.ts';

const cursor: SyncCursor = { since: '2026-09-01T04:00:00Z', next: null, maxSeen: null };

function message(id: string, receivedDateTime: string) {
  return {
    id,
    subject: 'BHD Notificación de Transacciones',
    receivedDateTime,
    from: { emailAddress: { address: 'Alertas@bhd.com.do', name: 'BHD' } },
    body: { contentType: 'html', content: '<table><tr><td>Fecha</td><td>Monto</td></tr></table>' },
  };
}

function graphFetch(responses: { status: number; body?: unknown }[], seen: { url: string; headers: Headers }[]): typeof fetch {
  return ((url: string, init?: RequestInit) => {
    seen.push({ url, headers: new Headers(init?.headers) });
    const next = responses.shift() ?? { status: 500 };
    return Promise.resolve(new Response(JSON.stringify(next.body ?? {}), { status: next.status }));
  }) as typeof fetch;
}

Deno.test('firstPageUrl — filters by exact sender since the cursor minus the overlap, oldest first', () => {
  const raw = firstPageUrl(['alertas@bhd.com.do'], cursor);
  const url = new URL(raw);
  // 04:00Z − 10 min = 03:50Z del 1.
  assertEquals(
    url.searchParams.get('$filter'),
    "receivedDateTime ge 2026-09-01T03:50:00Z and (from/emailAddress/address eq 'alertas@bhd.com.do')",
  );
  assertEquals(url.searchParams.get('$orderby'), 'receivedDateTime asc');
  assertEquals(url.searchParams.get('$top'), '50');
  assertStringIncludes(url.searchParams.get('$select') ?? '', 'body');
  assertStringIncludes(raw, '$filter=');
  assertStringIncludes(raw, '$orderby=');
});

Deno.test('regression — never query with $search (Graph ignores ImmutableId there, a moved alert would duplicate)', () => {
  const url = new URL(firstPageUrl(['alertas@bhd.com.do'], cursor));
  assertEquals(url.searchParams.has('$search'), false);
});

Deno.test('toRawEmail — maps a Graph message and converts the HTML body to text', () => {
  const raw = toRawEmail(message('AAkALg-immutable', '2026-09-16T02:43:15Z'));
  assertEquals(raw.messageId, 'AAkALg-immutable');
  assertEquals(raw.from, 'Alertas@bhd.com.do');
  assertEquals(raw.receivedAt, '2026-09-16T02:43:15Z');
  assertEquals(raw.text, 'Fecha | Monto');
});

Deno.test('fetchNew — sends the immutable id header and follows the next link', async () => {
  const seen: { url: string; headers: Headers }[] = [];
  const provider = createGraphProvider({
    clientId: 'c',
    addresses: ['alertas@bhd.com.do'],
    fetchImpl: graphFetch([{ status: 200, body: { value: [message('a', '2026-09-10T00:00:00Z')], '@odata.nextLink': 'https://graph.example/next' } }], seen),
  });
  const page = await provider.fetchNew('at', cursor);
  assertEquals(seen[0].headers.get('Prefer'), 'IdType="ImmutableId"');
  assertEquals(seen[0].headers.get('Authorization'), 'Bearer at');
  assertEquals(page.hasMore, true);
  assertEquals(page.cursor.next, 'https://graph.example/next');
  assertEquals(page.emails.length, 1);
});

Deno.test('fetchNew — an expired next link restarts from since instead of failing forever', async () => {
  const seen: { url: string; headers: Headers }[] = [];
  const provider = createGraphProvider({
    clientId: 'c',
    addresses: ['alertas@bhd.com.do'],
    fetchImpl: graphFetch([{ status: 400 }, { status: 200, body: { value: [] } }], seen),
  });
  const page = await provider.fetchNew('at', { ...cursor, next: 'https://graph.example/stale', maxSeen: '2026-09-10T00:00:00Z' });
  assertEquals(seen[0].url, 'https://graph.example/stale');
  assertStringIncludes(seen[1].url, '$filter=');
  assertEquals(page.cursor, cursor);
});

Deno.test('fetchNew — 401 is auth, 429 and 5xx are transient', async () => {
  const make = (status: number) => createGraphProvider({ clientId: 'c', addresses: ['alertas@bhd.com.do'], fetchImpl: graphFetch([{ status }], []) });
  await assertRejects(() => make(401).fetchNew('at', cursor), MailAuthError);
  await assertRejects(() => make(429).fetchNew('at', cursor), MailTransientError);
  await assertRejects(() => make(503).fetchNew('at', cursor), MailTransientError);
});

Deno.test('regression — a 200 whose body is not JSON is transient, not a generic error', async () => {
  const fetchImpl = (() => Promise.resolve(new Response('<html>gateway</html>', { status: 200 }))) as typeof fetch;
  const provider = createGraphProvider({ clientId: 'c', addresses: ['alertas@bhd.com.do'], fetchImpl });
  await assertRejects(() => provider.fetchNew('at', cursor), MailTransientError);
});

Deno.test('regression — Graph requests carry a timeout so a hung connection cannot hold the whole sync run', async () => {
  let signal: AbortSignal | null | undefined;
  const provider = createGraphProvider({
    clientId: 'c',
    fetchImpl: ((_url: string, init?: RequestInit) => {
      signal = init?.signal;
      return Promise.resolve(new Response('{}', { status: 401 }));
    }) as typeof fetch,
  });
  await assertRejects(() => provider.fetchNew('at', cursor), MailAuthError);
  assertEquals(signal instanceof AbortSignal, true);
});

