import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import { createBcrdSource, BCRD_RATES_URL, parseBcrdRates } from './bcrd.ts';
import { RateSourceError } from './types.ts';

// Valores fijados por el spike (ver el spec del Plan 3c, §2 "Muestra de la fuente").
const FIRST = { date: '1991-01-02', sell: 11.5 };
const PINNED = { date: '2026-09-07', buy: 58.5789, sell: 58.9622 };
const MISSING = '2026-09-12'; // sábado
const LAST = { date: '2026-10-13', sell: 61.5396 };
const ROWS = 8982;

const sample = await Deno.readFile(new URL('./fixtures/bcrd-2026-10-15.xlsx', import.meta.url));

Deno.test('reads the first and last published days of the real sample', () => {
  const rates = parseBcrdRates(sample);
  assertEquals(rates[0], FIRST);
  assertEquals(rates.at(-1), LAST);
  assertEquals(rates.length, ROWS);
});

Deno.test('reads the sell rate, not the buy rate', () => {
  const rate = parseBcrdRates(sample).find((r) => r.date === PINNED.date);
  assertEquals(rate?.sell, PINNED.sell);
  assertEquals(rate?.sell === PINNED.buy, false);
});

Deno.test('does not invent days the source did not publish', () => {
  assertEquals(parseBcrdRates(sample).find((r) => r.date === MISSING), undefined);
});

Deno.test('fails on an unrecognized document', () => {
  assertThrows(() => parseBcrdRates(new TextEncoder().encode('<html><body>Mantenimiento</body></html>')), RateSourceError);
  assertThrows(() => parseBcrdRates(new Uint8Array()), RateSourceError);
});

Deno.test('fails on a truncated workbook', () => {
  assertThrows(() => parseBcrdRates(sample.slice(0, 5000)), RateSourceError);
});

Deno.test('the source adapter parses what the URL returns', async () => {
  const requested: string[] = [];
  const fake = ((input: string | URL | Request) => {
    requested.push(String(input));
    return Promise.resolve(new Response(sample));
  }) as typeof fetch;
  const source = createBcrdSource(fake);
  const rates = await source.fetchRates(FIRST.date, LAST.date);
  assertEquals(source.id, 'bcrd');
  assertEquals(requested, [BCRD_RATES_URL]);
  assertEquals(rates.find((r) => r.date === PINNED.date)?.sell, PINNED.sell);
});

Deno.test('the source adapter fails on an HTTP error', async () => {
  const fake = (() => Promise.resolve(new Response('', { status: 503 }))) as typeof fetch;
  await assertRejects(() => createBcrdSource(fake).fetchRates(FIRST.date, LAST.date), RateSourceError);
});

Deno.test('the source adapter fails when the request itself fails', async () => {
  const fake = (() => Promise.reject(new TypeError('network down'))) as typeof fetch;
  await assertRejects(() => createBcrdSource(fake).fetchRates(FIRST.date, LAST.date), RateSourceError);
});

Deno.test('the URL is the one the spike recorded', () => {
  assertEquals(BCRD_RATES_URL, 'https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx');
});
