import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { parseRate, toUsdRates } from './normalize.ts';
import { RateSourceError } from './types.ts';

Deno.test('parseRate reads dot and comma decimals up to 4 places', () => {
  assertEquals(parseRate('59.1234'), 59.1234);
  assertEquals(parseRate('59,1234'), 59.1234);
  assertEquals(parseRate(' 60.5 '), 60.5);
  assertEquals(parseRate(59.12), 59.12);
});

Deno.test('parseRate removes float noise from numeric cells', () => {
  assertEquals(parseRate(59.123400000001), 59.1234);
});

Deno.test('parseRate rejects anything it would have to guess', () => {
  for (const bad of ['59.12345', '1,234.56', '59.12.34', '', 'abc', '0', '-5', '1000']) assertEquals(parseRate(bad), null, bad);
  for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 1000]) assertEquals(parseRate(bad), null, String(bad));
});

Deno.test('toUsdRates sorts by date and keeps the gaps the source has', () => {
  assertEquals(toUsdRates([{ date: '2026-09-14', sell: '59,30' }, { date: '2026-09-11', sell: 59.4 }]), [
    { date: '2026-09-11', sell: 59.4 },
    { date: '2026-09-14', sell: 59.3 },
  ]);
});

Deno.test('toUsdRates collapses identical duplicates', () => {
  assertEquals(toUsdRates([{ date: '2026-09-11', sell: '59.40' }, { date: '2026-09-11', sell: 59.4 }]), [{ date: '2026-09-11', sell: 59.4 }]);
});

Deno.test('toUsdRates fails on a dated row with an unreadable rate', () => {
  assertThrows(() => toUsdRates([{ date: '2026-09-11', sell: 'N/D' }]), RateSourceError);
});

Deno.test('toUsdRates fails on the same date with two different rates', () => {
  assertThrows(() => toUsdRates([{ date: '2026-09-11', sell: 59.4 }, { date: '2026-09-11', sell: 59.5 }]), RateSourceError);
});

Deno.test('toUsdRates fails on an impossible date and on an empty table', () => {
  assertThrows(() => toUsdRates([{ date: '2026-02-30', sell: 59 }]), RateSourceError);
  assertThrows(() => toUsdRates([]), RateSourceError);
});
