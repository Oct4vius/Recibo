import { assertEquals } from 'jsr:@std/assert@1';
import {
  cleanMerchant,
  currencyFromCode,
  decodeEntities,
  htmlToText,
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

Deno.test('parseLocalDate — rejects invalid', () => {
  assertEquals(parseLocalDate('32/09/2026 10:42 pm'), null);
  assertEquals(parseLocalDate('16/13/2026 10:42 pm'), null);
  assertEquals(parseLocalDate('16/09/2026 13:42 pm'), null);
  assertEquals(parseLocalDate('sin fecha'), null);
});

Deno.test('cleanMerchant', () => {
  assertEquals(cleanMerchant('  UBER*RIDES  '), 'UBER*RIDES');
  assertEquals(cleanMerchant('GOMEZ   PEÑA,  MARIA'), 'GOMEZ PEÑA, MARIA');
  assertEquals(cleanMerchant('   '), null);
  assertEquals(cleanMerchant(''), null);
});
