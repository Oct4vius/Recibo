import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { bankSenderAddresses, gmailQuery, senderFilter } from './sender-query.ts';

Deno.test('bankSenderAddresses — every searched bank address, once, sorted', () => {
  const addresses = bankSenderAddresses();
  assertEquals(addresses.includes('alertas@bhd.com.do'), true);
  assertEquals(addresses.includes('noreply@apap.com.do'), true);
  assertEquals(addresses, [...new Set(addresses)].sort());
});

Deno.test('senderFilter — exact sender addresses since the given instant', () => {
  assertEquals(
    senderFilter(['alertas@bhd.com.do', 'noreply@apap.com.do'], '2026-09-01T03:50:00.000Z'),
    "receivedDateTime ge 2026-09-01T03:50:00Z and (from/emailAddress/address eq 'alertas@bhd.com.do' or from/emailAddress/address eq 'noreply@apap.com.do')",
  );
});

Deno.test('senderFilter — milliseconds are truncated, never rounded up', () => {
  assertEquals(senderFilter(['a@x.do'], '2026-09-01T03:50:00.999Z').startsWith('receivedDateTime ge 2026-09-01T03:50:00Z and'), true);
});

Deno.test('senderFilter — doubles single quotes (OData escaping)', () => {
  assertEquals(senderFilter(["o'neil@x.do"], '2026-09-01T03:50:00Z').includes("eq 'o''neil@x.do'"), true);
});

Deno.test('senderFilter — an empty address list throws', () => {
  assertThrows(() => senderFilter([], '2026-09-01T03:50:00Z'), Error, 'no sender addresses');
});

Deno.test('gmailQuery — exact senders after the given instant in whole epoch seconds', () => {
  assertEquals(
    gmailQuery(['alertas@bhd.com.do', 'noreply@apap.com.do'], '2026-09-01T03:50:00.999Z'),
    'from:(alertas@bhd.com.do OR noreply@apap.com.do) after:1788234600',
  );
  assertThrows(() => gmailQuery([], '2026-09-01T03:50:00Z'), Error, 'no sender addresses');
});
