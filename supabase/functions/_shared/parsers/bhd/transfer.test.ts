import { assertEquals } from 'jsr:@std/assert@1';
import type { ParsedTransaction, RawEmail } from '../types.ts';
import { transfer } from './transfer.ts';

function fixture(name: string): RawEmail {
  return JSON.parse(Deno.readTextFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
}

function synthetic(overrides: Partial<Record<'monto' | 'beneficiario' | 'confirmacion' | 'fecha' | 'destino', string>> = {}): RawEmail {
  const v = {
    monto: 'RD$ 3,500.00',
    beneficiario: 'GOMEZ PEÑA, MARIA',
    confirmacion: 'M12-0000-1111-2222-3',
    fecha: '16/09/2026 - 9:53 AM',
    destino: 'DO82BCBH000000000XXXXXXX0077',
    ...overrides,
  };
  return {
    messageId: '<synthetic-transfer@bhd.com.do>',
    from: 'Alertas@bhd.com.do',
    subject: 'Transacciones entre productos BHD y a otros Bancos',
    receivedAt: '2026-09-16T13:53:21.000Z',
    text: [
      'Estimado(a): JUAN PEREZ',
      'A continuación la información relacionada a tu transacción:',
      'Producto origen: | DO09BCBH000000000XXXXXXX0099',
      `Producto destino: | ${v.destino}`,
      'Descripción:',
      `Monto: | ${v.monto}`,
      `Beneficiario: | ${v.beneficiario}`,
      `Número de confirmación: | ${v.confirmacion}`,
      `Fecha y hora de la transacción: | ${v.fecha}`,
      'Tipo de transacción: | Transacciones entre productos BHD y a otros Bancos',
      'Nota: Este correo electrónico es generado de manera automática.',
    ].join('\n'),
  };
}

const EXPECTED: ParsedTransaction = {
  bankCode: 'bhd',
  type: 'transfer_out',
  amount: 3500,
  currency: 'DOP',
  merchant: 'GOMEZ PEÑA, MARIA',
  occurredAt: '2026-09-16T09:53:00-04:00',
  reference: 'M12-0000-1111-2222-3',
  counterpartyLast4: '0077',
  rowIndex: 0,
  templateId: 'bhd/transfer',
};

Deno.test('bhd/transfer — matches only its subject', () => {
  assertEquals(transfer.matches(fixture('transfer-out')), true);
  assertEquals(transfer.matches({ ...fixture('transfer-out'), subject: 'BHD Notificación de Transacciones' }), false);
});

Deno.test('bhd/transfer — real fixture', () => {
  assertEquals(transfer.parse(fixture('transfer-out')), [EXPECTED]);
});

Deno.test('bhd/transfer — synthetic mirrors the real fixture', () => {
  assertEquals(transfer.parse(synthetic()), [EXPECTED]);
});

Deno.test('bhd/transfer — USD amount', () => {
  const [tx] = transfer.parse(synthetic({ monto: 'US$ 120.50' }));
  assertEquals(tx.amount, 120.5);
  assertEquals(tx.currency, 'USD');
});

Deno.test('bhd/transfer — amount without currency prefix → [] (never guess currency)', () => {
  assertEquals(transfer.parse(synthetic({ monto: '$3,500.00' })), []);
});

Deno.test('bhd/transfer — missing amount or date → []', () => {
  assertEquals(transfer.parse({ ...synthetic(), text: synthetic().text.replace(/^Monto:.*$/m, 'Monto:') }), []);
  assertEquals(transfer.parse(synthetic({ fecha: 'ayer' })), []);
});

Deno.test('bhd/transfer — missing beneficiary → merchant null; missing confirmation → no reference key', () => {
  const noBeneficiary = { ...synthetic(), text: synthetic().text.replace(/^Beneficiario:.*$/m, 'Beneficiario:') };
  assertEquals(transfer.parse(noBeneficiary)[0].merchant, null);

  const noRef = { ...synthetic(), text: synthetic().text.replace(/^Número de confirmación:.*$/m, 'Número de confirmación:') };
  assertEquals('reference' in transfer.parse(noRef)[0], false);
});

Deno.test('bhd/transfer — destination without trailing digits → no counterpartyLast4 key', () => {
  const [tx] = transfer.parse(synthetic({ destino: 'CUENTA EXTERNA' }));
  assertEquals('counterpartyLast4' in tx, false);
});
