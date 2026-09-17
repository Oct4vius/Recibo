import { assertEquals } from 'jsr:@std/assert@1';
import type { RawEmail } from '../types.ts';
import { transactionsTable } from './transactions-table.ts';

function fixture(name: string): RawEmail {
  return JSON.parse(Deno.readTextFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
}

function synthetic(rows: string[]): RawEmail {
  return {
    messageId: '<synthetic@bhd.com.do>',
    from: 'Alertas@bhd.com.do',
    subject: 'BHD Notificación de Transacciones',
    receivedAt: '2026-09-17T02:43:15.000Z',
    text: [
      'BHD Notificación de Transacciones',
      'Visa Débito Intl # 1234',
      'Detalle de Criterios',
      'Te notificamos la transacción realizada con tu Tarjeta Visa Débito Intl # 1234',
      'Detalle de Transacciones',
      'Fecha | Moneda | Monto | Comercio | Estado | Tipo',
      ...rows,
      'Ahora, tus Tarjetas BHD cuentan con un nuevo sistema de seguridad.',
    ].join('\n'),
  };
}

Deno.test('bhd/transactions-table — matches only its subject', () => {
  assertEquals(transactionsTable.matches(fixture('card-purchase-approved')), true);
  assertEquals(transactionsTable.matches({ ...fixture('card-purchase-approved'), subject: 'Estado de cuenta' }), false);
});

Deno.test('bhd/transactions-table — approved purchase (real fixture)', () => {
  assertEquals(transactionsTable.parse(fixture('card-purchase-approved')), [{
    bankCode: 'bhd',
    type: 'card_purchase',
    amount: 275.72,
    currency: 'DOP',
    merchant: 'UBER*RIDES',
    occurredAt: '2026-09-16T22:42:00-04:00',
    cardLast4: '1234',
    rowIndex: 0,
    templateId: 'bhd/transactions-table',
  }]);
});

Deno.test('bhd/transactions-table — reversed purchase has null merchant (real fixture)', () => {
  assertEquals(transactionsTable.parse(fixture('card-purchase-reversed')), [{
    bankCode: 'bhd',
    type: 'card_reversal',
    amount: 434.22,
    currency: 'DOP',
    merchant: null,
    occurredAt: '2026-09-16T21:31:00-04:00',
    cardLast4: '1234',
    rowIndex: 0,
    templateId: 'bhd/transactions-table',
  }]);
});

Deno.test('regression — approved purchase in the same minute as a reversal keeps its own amount', () => {
  // Real case: Aprobada $438.42 y Reversada $434.22 a las 9:31 pm. No son la misma transacción.
  const approved = transactionsTable.parse(fixture('card-purchase-approved-near-reversal'));
  const reversed = transactionsTable.parse(fixture('card-purchase-reversed'));
  assertEquals(approved[0].amount, 438.42);
  assertEquals(approved[0].type, 'card_purchase');
  assertEquals(approved[0].merchant, 'UBER*RIDES');
  assertEquals(reversed[0].amount, 434.22);
  assertEquals(approved[0].occurredAt, reversed[0].occurredAt);
});

Deno.test('bhd/transactions-table — multiple rows produce one transaction each with rowIndex', () => {
  const email = synthetic([
    '16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra',
    '16/09/2026 10:50 pm | US | $12.00 | NETFLIX.COM | Aprobada | Compra',
  ]);
  const result = transactionsTable.parse(email);
  assertEquals(result.length, 2);
  assertEquals(result[0].rowIndex, 0);
  assertEquals(result[1].rowIndex, 1);
  assertEquals(result[1].currency, 'USD');
  assertEquals(result[1].amount, 12);
  assertEquals(result[1].merchant, 'NETFLIX.COM');
  assertEquals(result[1].occurredAt, '2026-09-16T22:50:00-04:00');
});

Deno.test('bhd/transactions-table — unknown status makes the whole email unparsed (all or nothing)', () => {
  const email = synthetic([
    '16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra',
    '16/09/2026 10:50 pm | RD | $50.00 | FARMACIA | Declinada | Compra',
  ]);
  assertEquals(transactionsTable.parse(email), []);
});

Deno.test('bhd/transactions-table — "Retiro" is not mapped yet (no real fixture)', () => {
  const email = synthetic(['16/09/2026 10:42 pm | RD | $2,000.00 | CAJERO BHD | Aprobada | Retiro']);
  assertEquals(transactionsTable.parse(email), []);
});

Deno.test('bhd/transactions-table — invalid amount or date → []', () => {
  assertEquals(transactionsTable.parse(synthetic(['16/09/2026 10:42 pm | RD | N/A | X | Aprobada | Compra'])), []);
  assertEquals(transactionsTable.parse(synthetic(['ayer | RD | $1.00 | X | Aprobada | Compra'])), []);
  assertEquals(transactionsTable.parse(synthetic(['16/09/2026 10:42 pm | EUR | $1.00 | X | Aprobada | Compra'])), []);
});

Deno.test('bhd/transactions-table — no header row → []', () => {
  assertEquals(transactionsTable.parse({ ...synthetic([]), text: 'Correo sin tabla' }), []);
});

Deno.test('bhd/transactions-table — missing card header still parses, without cardLast4', () => {
  const email = synthetic(['16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra']);
  email.text = email.text.replace(/# 1234/g, '');
  const [tx] = transactionsTable.parse(email);
  assertEquals('cardLast4' in tx, false);
});
