import { assertEquals } from 'jsr:@std/assert@1';
import { bankSenderDomains, senderSearch } from './sender-query.ts';

Deno.test('bankSenderDomains — every registered and candidate bank domain, once, sorted', () => {
  const domains = bankSenderDomains();
  assertEquals(domains.includes('bhd.com.do'), true);
  assertEquals(domains.includes('apap.com.do'), true);
  assertEquals(domains, [...new Set(domains)].sort());
});

Deno.test('senderSearch — KQL by sender domain since a day', () => {
  assertEquals(
    senderSearch(['bhd.com.do', 'apap.com.do'], '2026-09-01T03:50:00.000Z'),
    '(from:bhd.com.do OR from:apap.com.do) AND received>=2026-09-01',
  );
});
