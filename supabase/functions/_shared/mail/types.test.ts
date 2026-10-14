import { assertEquals } from 'jsr:@std/assert@1';
import { parseCursor } from './types.ts';

Deno.test('parseCursor — reads the JSON stored in linked_accounts.sync_cursor', () => {
  assertEquals(parseCursor('{"since":"2026-09-01T04:00:00Z","next":null,"maxSeen":null}'), {
    since: '2026-09-01T04:00:00Z',
    next: null,
    maxSeen: null,
  });
});

Deno.test('parseCursor — rejects null, garbage and cursors without since', () => {
  assertEquals(parseCursor(null), null);
  assertEquals(parseCursor('not json'), null);
  assertEquals(parseCursor('{"next":null}'), null);
});

Deno.test('regression — parseCursor rejects a since that is not a date', () => {
  assertEquals(parseCursor('{"since":"garbage","next":null,"maxSeen":null}'), null);
});
