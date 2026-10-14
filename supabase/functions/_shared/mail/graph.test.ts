import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1';
import { createGraphProvider, firstPageUrl, nextCursor, toRawEmail } from './graph.ts';
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

Deno.test('firstPageUrl — searches bank senders since the cursor minus the overlap', () => {
  const url = new URL(firstPageUrl(['bhd.com.do'], cursor));
  // 04:00Z − 10 min = 03:50Z del 1; la KQL arranca un día antes (zona del buzón).
  assertEquals(url.searchParams.get('$search'), '"(from:bhd.com.do) AND received>=2026-08-31"');
  assertEquals(url.searchParams.get('$top'), '50');
  assertStringIncludes(url.searchParams.get('$select') ?? '', 'body');
});

Deno.test('regression — firstPageUrl keeps the evening of the previous local day', () => {
  const url = new URL(firstPageUrl(['bhd.com.do'], { since: '2026-09-17T01:00:00Z', next: null, maxSeen: null }));
  assertEquals(url.searchParams.get('$search'), '"(from:bhd.com.do) AND received>=2026-09-16"');
});

Deno.test('toRawEmail — maps a Graph message and converts the HTML body to text', () => {
  const raw = toRawEmail(message('AAkALg-immutable', '2026-09-16T02:43:15Z'));
  assertEquals(raw.messageId, 'AAkALg-immutable');
  assertEquals(raw.from, 'Alertas@bhd.com.do');
  assertEquals(raw.receivedAt, '2026-09-16T02:43:15Z');
  assertEquals(raw.text, 'Fecha | Monto');
});

Deno.test('nextCursor — keeps since while pages remain, then advances to the newest message seen', () => {
  const page1 = [toRawEmail(message('a', '2026-09-10T00:00:00Z'))];
  const mid = nextCursor(cursor, page1, 'https://graph.example/next');
  assertEquals(mid, { since: cursor.since, next: 'https://graph.example/next', maxSeen: '2026-09-10T00:00:00Z' });
  const page2 = [toRawEmail(message('b', '2026-09-05T00:00:00Z'))];
  assertEquals(nextCursor(mid, page2, null), { since: '2026-09-10T00:00:00Z', next: null, maxSeen: null });
  assertEquals(nextCursor(cursor, [], null), cursor);
});

Deno.test('fetchNew — sends the immutable id header and follows the next link', async () => {
  const seen: { url: string; headers: Headers }[] = [];
  const provider = createGraphProvider({
    clientId: 'c',
    domains: ['bhd.com.do'],
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
    domains: ['bhd.com.do'],
    fetchImpl: graphFetch([{ status: 400 }, { status: 200, body: { value: [] } }], seen),
  });
  const page = await provider.fetchNew('at', { ...cursor, next: 'https://graph.example/stale', maxSeen: '2026-09-10T00:00:00Z' });
  assertEquals(seen[0].url, 'https://graph.example/stale');
  assertStringIncludes(seen[1].url, '$search');
  assertEquals(page.cursor, cursor);
});

Deno.test('fetchNew — 401 is auth, 429 and 5xx are transient', async () => {
  const make = (status: number) => createGraphProvider({ clientId: 'c', domains: ['bhd.com.do'], fetchImpl: graphFetch([{ status }], []) });
  await assertRejects(() => make(401).fetchNew('at', cursor), MailAuthError);
  await assertRejects(() => make(429).fetchNew('at', cursor), MailTransientError);
  await assertRejects(() => make(503).fetchNew('at', cursor), MailTransientError);
});

Deno.test('regression — a 200 whose body is not JSON is transient, not a generic error', async () => {
  const fetchImpl = (() => Promise.resolve(new Response('<html>gateway</html>', { status: 200 }))) as typeof fetch;
  const provider = createGraphProvider({ clientId: 'c', domains: ['bhd.com.do'], fetchImpl });
  await assertRejects(() => provider.fetchNew('at', cursor), MailTransientError);
});
