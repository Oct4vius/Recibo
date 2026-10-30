import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import { BCRD_RATES_URL, createBcrdSource, monthNumber, parseBcrdRates } from './bcrd.ts';
import { deflateRawSync } from 'node:zlib';
import { openZip } from './xlsx.ts';
import { RateSourceError } from './types.ts';

// Valores fijados por el spike (ver el spec del Plan 3c, §2 "Muestra de la fuente").
const FIRST = { date: '1991-01-02', sell: 11.5 };
const PINNED = { date: '2026-09-07', buy: 58.5789, sell: 58.9622 };
const MISSING = '2026-09-12'; // sábado
const LAST = { date: '2026-10-13', sell: 61.5396 };
const ROWS = 8982;

const sample = await Deno.readFile(new URL('./fixtures/bcrd-2026-10-15.xlsx', import.meta.url));

// El archivo real trae una fila vieja con 5 decimales (2020-09-29, 58.46532); las ventanas la evitan.
const BAD_DAY = '2020-09-29';
const EVERYTHING = { from: '1991-01-01', to: '2099-12-31' };

Deno.test('reads the first and last published days of the real sample', () => {
  const early = parseBcrdRates(sample, { from: FIRST.date, to: '2020-09-28' });
  const late = parseBcrdRates(sample, { from: '2020-09-30', to: EVERYTHING.to });
  assertEquals(early[0], FIRST);
  assertEquals(late.at(-1), LAST);
  assertEquals(early.length + late.length, ROWS - 1); // todo menos la fila de 5 decimales
});

Deno.test('reads the sell rate, not the buy rate', () => {
  const rate = parseBcrdRates(sample, { from: '2026-01-01', to: LAST.date }).find((r) => r.date === PINNED.date);
  assertEquals(rate?.sell, PINNED.sell);
  assertEquals(rate?.sell === PINNED.buy, false);
});

Deno.test('does not invent days the source did not publish', () => {
  assertEquals(parseBcrdRates(sample, { from: '2026-01-01', to: LAST.date }).find((r) => r.date === MISSING), undefined);
});

Deno.test('regression — an old row with 5 decimals outside the window does not break the daily load', () => {
  assertEquals(parseBcrdRates(sample, { from: '2026-09-01', to: LAST.date }).at(-1), LAST);
});

Deno.test('a row with 5 decimals inside the window fails the whole read (never rounded)', () => {
  assertThrows(() => parseBcrdRates(sample, { from: BAD_DAY, to: BAD_DAY }), RateSourceError);
  assertThrows(() => parseBcrdRates(sample), RateSourceError);
});

Deno.test('a window without published days is empty, not an error', () => {
  assertEquals(parseBcrdRates(sample, { from: '2099-01-01', to: '2099-01-07' }), []);
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
  const signals: (AbortSignal | null | undefined)[] = [];
  const fake = ((input: string | URL | Request, init?: RequestInit) => {
    requested.push(String(input));
    signals.push(init?.signal);
    return Promise.resolve(new Response(sample));
  }) as typeof fetch;
  const source = createBcrdSource(fake);
  const rates = await source.fetchRates('2026-01-01', LAST.date);
  assertEquals(source.id, 'bcrd');
  assertEquals(requested, [BCRD_RATES_URL]);
  assertEquals(signals.length === 1 && signals[0] instanceof AbortSignal, true);
  assertEquals(rates.find((r) => r.date === PINNED.date)?.sell, PINNED.sell);
});

Deno.test('the source adapter fails on an HTTP error', async () => {
  const fake = (() => Promise.resolve(new Response('', { status: 503 }))) as typeof fetch;
  await assertRejects(() => createBcrdSource(fake).fetchRates('2026-01-01', LAST.date), RateSourceError);
});

Deno.test('the source adapter fails when the request itself fails', async () => {
  const fake = (() => Promise.reject(new TypeError('network down'))) as typeof fetch;
  await assertRejects(() => createBcrdSource(fake).fetchRates('2026-01-01', LAST.date), RateSourceError);
});

Deno.test('the URL is the one the spike recorded', () => {
  assertEquals(BCRD_RATES_URL, 'https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx');
});

Deno.test('regression — month labels named like Object.prototype members are not months', () => {
  assertEquals(['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'].map(monthNumber), [null, null, null, null, null]);
});

Deno.test('month labels accept Spanish and unambiguous English names', () => {
  assertEquals(['Ene ', 'Jan', 'dic', 'Dec', 'Sept', 'sep', 'Aug', 'ago', 'Abr', 'apr'].map(monthNumber), [1, 1, 12, 12, 9, 9, 8, 8, 4, 4]);
  assertEquals([monthNumber('Foo'), monthNumber(''), monthNumber(3), monthNumber(undefined)], [null, null, null, null]);
});

Deno.test('the zip reader refuses entries bigger than the limit and ignores missing ones', () => {
  const zip = openZip(sample);
  assertEquals(zip.read('nope.xml'), undefined);
  assertThrows(() => zip.read('xl/worksheets/sheet1.xml', 1000), RateSourceError);
  assertEquals((zip.read('xl/workbook.xml')?.length ?? 0) > 0, true);
});

const deflate = (data: Uint8Array) => deflateRawSync(data) as unknown as Uint8Array;

/** Zip de una sola entrada cuya cabecera declara `declaredSize` sin importar el contenido real. */
function zipWithDeclaredSize(name: string, payload: Uint8Array, method: 0 | 8, declaredSize: number): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const local = new Uint8Array(30 + nameBytes.length + payload.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, method, true);
  lv.setUint32(18, payload.length, true);
  lv.setUint32(22, declaredSize, true);
  lv.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  local.set(payload, 30 + nameBytes.length);
  const central = new Uint8Array(46 + nameBytes.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, method, true);
  cv.setUint32(20, payload.length, true);
  cv.setUint32(24, declaredSize, true);
  cv.setUint16(28, nameBytes.length, true);
  central.set(nameBytes, 46);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length, true);
  return Uint8Array.from([...local, ...central, ...end]);
}

Deno.test('the zip reader refuses an entry whose real size exceeds the limit despite a small declared size', () => {
  const big = new Uint8Array(100_000);
  assertThrows(() => openZip(zipWithDeclaredSize('a.xml', deflate(big), 8, 10)).read('a.xml', 1000), RateSourceError);
  assertThrows(() => openZip(zipWithDeclaredSize('a.xml', big, 0, 10)).read('a.xml', 1000), RateSourceError);
  const ok = zipWithDeclaredSize('a.xml', deflate(new Uint8Array(500)), 8, 500);
  assertEquals(openZip(ok).read('a.xml', 1000)?.length, 500);
});
