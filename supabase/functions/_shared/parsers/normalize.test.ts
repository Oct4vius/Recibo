import { assertEquals } from 'jsr:@std/assert@1';
import {
  cleanMerchant,
  currencyFromCode,
  decodeEntities,
  htmlToText,
  keyValue,
  parseAmount,
  parseLocalDate,
  splitCells,
} from './normalize.ts';

Deno.test('decodeEntities — named, numeric and hex entities', () => {
  assertEquals(decodeEntities('a&nbsp;b &amp; c &lt;d&gt; &quot;e&quot; &#39;f&#39;'), 'a\u00a0b & c <d> "e" \'f\'');
  assertEquals(decodeEntities('Ni&ntilde;o &#209; &#xf1;'), 'Niño Ñ ñ');
  assertEquals(decodeEntities('&unknown; stays'), '&unknown; stays');
});

Deno.test('htmlToText — table rows become pipe-separated lines', () => {
  const html = `
    <html><head><style>td{color:red}</style></head><body>
    <div class="titleA">BHD Notificaci&oacute;n</div>
    <table><thead><tr><td> Fecha </td><td>
      Moneda
    </td><td>Monto</td></tr></thead>
    <tbody><tr><td>16/09/2026 10:42 pm</td><td>RD</td><td>$275.72</td></tr></tbody></table>
    <p>Ahora, tus <b>Tarjetas</b> BHD.</p>
    </body></html>`;
  assertEquals(htmlToText(html), [
    'BHD Notificación',
    'Fecha | Moneda | Monto',
    '16/09/2026 10:42 pm | RD | $275.72',
    'Ahora, tus Tarjetas BHD.',
  ].join('\n'));
});

Deno.test('htmlToText — keeps empty cells in the middle of a row', () => {
  const html = '<table><tr><td>$434.22</td><td>  </td><td>Reversada</td></tr></table>';
  assertEquals(htmlToText(html), '$434.22 | | Reversada');
});

Deno.test('htmlToText — key/value row with empty value keeps the label only', () => {
  const html = '<table><tr><td>Descripci&oacute;n:</td><td></td></tr><tr><td>Monto:</td><td>RD$ 3,500.00</td></tr></table>';
  assertEquals(htmlToText(html), 'Descripción:\nMonto: | RD$ 3,500.00');
});

Deno.test('htmlToText — <br> and nbsp are handled', () => {
  assertEquals(htmlToText('<p>Estimado(a):&nbsp;JUAN PEREZ<br>Segunda l&iacute;nea</p>'), 'Estimado(a): JUAN PEREZ\nSegunda línea');
});

Deno.test('splitCells', () => {
  assertEquals(splitCells('a | b |  | d'), ['a', 'b', '', 'd']);
  assertEquals(splitCells('single'), ['single']);
});

Deno.test('parseAmount — plain dollar without currency', () => {
  assertEquals(parseAmount('$275.72'), { amount: 275.72, currency: null });
  assertEquals(parseAmount('$1,234.5'), { amount: 1234.5, currency: null });
  assertEquals(parseAmount('275'), { amount: 275, currency: null });
});

Deno.test('parseAmount — currency prefixes', () => {
  assertEquals(parseAmount('RD$ 3,500.00'), { amount: 3500, currency: 'DOP' });
  assertEquals(parseAmount('US$ 12.00'), { amount: 12, currency: 'USD' });
  assertEquals(parseAmount('DOP 10.10'), { amount: 10.1, currency: 'DOP' });
});

Deno.test('parseAmount — rejects garbage', () => {
  assertEquals(parseAmount(''), null);
  assertEquals(parseAmount('abc'), null);
  assertEquals(parseAmount('12.345'), null);
});

Deno.test('currencyFromCode', () => {
  assertEquals(currencyFromCode('RD'), 'DOP');
  assertEquals(currencyFromCode('rd$'), 'DOP');
  assertEquals(currencyFromCode('DOP'), 'DOP');
  assertEquals(currencyFromCode('US'), 'USD');
  assertEquals(currencyFromCode('USD'), 'USD');
  assertEquals(currencyFromCode('EUR'), null);
});

Deno.test('parseLocalDate — BHD table format (lowercase am/pm)', () => {
  assertEquals(parseLocalDate('16/09/2026 10:42 pm'), '2026-09-16T22:42:00-04:00');
  assertEquals(parseLocalDate('16/09/2026 09:31 pm'), '2026-09-16T21:31:00-04:00');
  assertEquals(parseLocalDate('01/01/2026 12:05 am'), '2026-01-01T00:05:00-04:00');
  assertEquals(parseLocalDate('01/01/2026 12:05 pm'), '2026-01-01T12:05:00-04:00');
});

Deno.test('parseLocalDate — BHD transfer format (dash, uppercase AM/PM, no leading zero)', () => {
  assertEquals(parseLocalDate('16/09/2026 - 9:53 AM'), '2026-09-16T09:53:00-04:00');
});

Deno.test('parseLocalDate — pipe between date and time (separate cells)', () => {
  assertEquals(parseLocalDate('04/09/2026 | 9:24 AM'), '2026-09-04T09:24:00-04:00');
  assertEquals(parseLocalDate('11/09/2026 | 3:23 PM'), '2026-09-11T15:23:00-04:00');
});

Deno.test('keyValue — value after the pipe, empty value, missing label', () => {
  const lines = ['Monto: | RD$ 200', 'Descripción:', 'Fecha: | 04/09/2026 | 9:24 AM'];
  assertEquals(keyValue(lines, /^Monto:/i), 'RD$ 200');
  assertEquals(keyValue(lines, /^Descripci[oó]n:/i), '');
  assertEquals(keyValue(lines, /^Fecha:/i), '04/09/2026 | 9:24 AM');
  assertEquals(keyValue(lines, /^Beneficiario:/i), null);
});

Deno.test('parseLocalDate — rejects invalid', () => {
  assertEquals(parseLocalDate('32/09/2026 10:42 pm'), null);
  assertEquals(parseLocalDate('16/13/2026 10:42 pm'), null);
  assertEquals(parseLocalDate('16/09/2026 13:42 pm'), null);
  assertEquals(parseLocalDate('sin fecha'), null);
});

Deno.test('parseLocalDate — rejects impossible calendar dates', () => {
  assertEquals(parseLocalDate('31/02/2026 10:42 pm'), null);
  assertEquals(parseLocalDate('29/02/2028 10:42 pm'), '2028-02-29T22:42:00-04:00');
  assertEquals(parseLocalDate('31/04/2026 1:00 AM'), null);
});

Deno.test('cleanMerchant', () => {
  assertEquals(cleanMerchant('  UBER*RIDES  '), 'UBER*RIDES');
  assertEquals(cleanMerchant('GOMEZ   PEÑA,  MARIA'), 'GOMEZ PEÑA, MARIA');
  assertEquals(cleanMerchant('   '), null);
  assertEquals(cleanMerchant(''), null);
});

Deno.test('htmlToText — <br> with attributes is treated as a block end', () => {
  assertEquals(htmlToText('<p>a<br class="x">b</p>'), 'a\nb');
});

Deno.test('htmlToText — HTML comments are stripped (Outlook conditional comments)', () => {
  assertEquals(htmlToText('<!--[if mso]>HIDDEN<![endif]--><p>x</p>'), 'x');
  assertEquals(htmlToText('<!-- a > b --><p>x</p>'), 'x');
});

Deno.test('htmlToText — block elements inside a cell do not break the row (continuation lines merge)', () => {
  const html = '<table>'
    + '<tr><td><p>Monto:</p></td><td>RD$ 3,500.00</td></tr>'
    + '<tr><td><p>Descripción:</p></td><td></td></tr>'
    + '</table>';
  assertEquals(htmlToText(html), 'Monto: | RD$ 3,500.00\nDescripción:');
});

// Entradas hostiles no deben costar tiempo cuadrático ni producir valores que la base rechace (un solo correo así
// bloqueaba la sincronización de la cuenta).
const LINEAR_BUDGET_MS = 1500;

Deno.test('regression — htmlToText is linear on unclosed tags, comments, scripts and <br', () => {
  const n = 200_000;
  const cases: [string, string][] = [
    ['unclosed <', '<'.repeat(n)],
    ['unclosed comments', '<!--'.repeat(n / 4)],
    ['unclosed scripts', '<script>'.repeat(n / 8)],
    ['unclosed br', '<br'.repeat(n / 3)],
    ['many empty cells', '<tr>' + '<td></td>'.repeat(n / 9) + '<td>x</td></tr>'],
  ];
  for (const [label, html] of cases) {
    const start = performance.now();
    htmlToText(html);
    const ms = performance.now() - start;
    if (ms > LINEAR_BUDGET_MS) throw new Error(`${label}: ${ms.toFixed(0)} ms for ${html.length} chars`);
  }
});

Deno.test('htmlToText — unclosed markup is kept as text, not swallowed', () => {
  assertEquals(htmlToText('a <b c'), 'a <b c');
  assertEquals(htmlToText('<p>x</p><!-- never closed'), 'x\n<!-- never closed');
  assertEquals(htmlToText('<script>alert(1)'), 'alert(1)');
  assertEquals(htmlToText('<td>a</td><td>b</td><td></td><td></td>'), 'a | b');
});

Deno.test('regression — parseAmount rejects zero and amounts that do not fit numeric(14,2)', () => {
  assertEquals(parseAmount('$0.00'), null);
  assertEquals(parseAmount('RD$ 0'), null);
  assertEquals(parseAmount('$1,000,000,000,000.00'), null);
  assertEquals(parseAmount('99999999999999999999'), null);
  assertEquals(parseAmount('$999,999,999,999.99'), { amount: 999999999999.99, currency: null });
  assertEquals(parseAmount('$0.01'), { amount: 0.01, currency: null });
});

Deno.test('regression — decodeEntities never produces a lone surrogate', () => {
  assertEquals(decodeEntities('&#xD800;'), '&#xD800;');
  assertEquals(decodeEntities('&#57343;'), '&#57343;');
  assertEquals(decodeEntities('&#x1F600;'), '\u{1F600}');
});
