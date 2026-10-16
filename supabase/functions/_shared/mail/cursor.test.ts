import { assertEquals } from 'jsr:@std/assert@1';
import type { RawEmail } from '../parsers/index.ts';
import { nextCursor } from './cursor.ts';
import type { SyncCursor } from './types.ts';

const cursor: SyncCursor = { since: '2026-09-01T04:00:00Z', next: null, maxSeen: null };

function raw(messageId: string, receivedAt: string): RawEmail {
  return { messageId, from: 'Alertas@bhd.com.do', subject: 's', text: 't', receivedAt };
}

Deno.test('nextCursor — keeps since while pages remain, then advances to the newest message seen', () => {
  const mid = nextCursor(cursor, [raw('a', '2026-09-10T00:00:00Z')], 'https://graph.example/next');
  assertEquals(mid, { since: cursor.since, next: 'https://graph.example/next', maxSeen: '2026-09-10T00:00:00Z' });
  assertEquals(nextCursor(mid, [raw('b', '2026-09-05T00:00:00Z')], null), { since: '2026-09-10T00:00:00Z', next: null, maxSeen: null });
  assertEquals(nextCursor(cursor, [], null), cursor);
});

Deno.test('nextCursor — newest-first pages (Gmail) keep since until the last page and end at the newest seen', () => {
  const c0: SyncCursor = { since: '2026-09-01T04:00:00Z', next: null, maxSeen: null };
  const mid = nextCursor(c0, [raw('a', '2026-09-20T10:00:00.000Z'), raw('b', '2026-09-18T10:00:00.000Z')], 'token-2');
  assertEquals(mid, { since: c0.since, next: 'token-2', maxSeen: '2026-09-20T10:00:00.000Z' });
  assertEquals(nextCursor(mid, [raw('c', '2026-09-02T10:00:00.000Z')], null), {
    since: '2026-09-20T10:00:00.000Z',
    next: null,
    maxSeen: null,
  });
});
