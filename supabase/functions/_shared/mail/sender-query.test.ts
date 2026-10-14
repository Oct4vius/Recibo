import { assertEquals } from 'jsr:@std/assert@1';
import { bankSenderDomains, senderSearch } from './sender-query.ts';

Deno.test('bankSenderDomains — every registered and candidate bank domain, once, sorted', () => {
  const domains = bankSenderDomains();
  assertEquals(domains.includes('bhd.com.do'), true);
  assertEquals(domains.includes('apap.com.do'), true);
  assertEquals(domains, [...new Set(domains)].sort());
});

Deno.test('senderSearch — KQL by sender domain since the day before the UTC date of since', () => {
  assertEquals(
    senderSearch(['bhd.com.do', 'apap.com.do'], '2026-09-01T03:50:00.000Z'),
    '(from:bhd.com.do OR from:apap.com.do) AND received>=2026-08-31',
  );
});

Deno.test('regression — the KQL day never skips evening mail when Graph reads the date in the mailbox zone', () => {
  // 01:00Z del 17 = 21:00 del 16 en Santo Domingo: el día 16 debe seguir dentro de la búsqueda.
  assertEquals(senderSearch(['bhd.com.do'], '2026-09-17T01:00:00Z'), '(from:bhd.com.do) AND received>=2026-09-16');
});
