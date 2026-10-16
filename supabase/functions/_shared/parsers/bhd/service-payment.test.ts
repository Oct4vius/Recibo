import { assertEquals } from 'jsr:@std/assert@1';
import { servicePayment } from './service-payment.ts';
import { loadFixture } from '../test-helpers.ts';

Deno.test('bhd/service-payment — matches only its subject', () => {
  assertEquals(servicePayment.matches(loadFixture('bhd', 'service-payment')), true);
  assertEquals(servicePayment.matches(loadFixture('bhd', 'transfer-out')), false);
  assertEquals(servicePayment.matches(loadFixture('bhd', 'card-purchase-approved')), false);
});

Deno.test('bhd/service-payment — ALTICE MOVIL payment (real fixture)', () => {
  assertEquals(servicePayment.parse(loadFixture('bhd', 'service-payment')), [{
    bankCode: 'bhd',
    type: 'transfer_out',
    amount: 200,
    currency: 'DOP',
    merchant: 'ALTICE MOVIL',
    occurredAt: '2026-09-04T09:24:00-04:00',
    reference: 'M20-0000-1111-2222-3',
    rowIndex: 0,
    templateId: 'bhd/service-payment',
  }]);
});

Deno.test('bhd/service-payment — CLARO payment (real fixture)', () => {
  assertEquals(servicePayment.parse(loadFixture('bhd', 'service-payment-claro')), [{
    bankCode: 'bhd',
    type: 'transfer_out',
    amount: 100,
    currency: 'DOP',
    merchant: 'CLARO',
    occurredAt: '2026-09-11T15:23:00-04:00',
    reference: 'M20-0000-1111-2222-3',
    rowIndex: 0,
    templateId: 'bhd/service-payment',
  }]);
});

Deno.test('bhd/service-payment — missing amount, currency or date → [] (all or nothing)', () => {
  const base = loadFixture('bhd', 'service-payment');
  assertEquals(servicePayment.parse({ ...base, text: base.text.replace(/^Monto:.*$/m, 'Monto:') }), []);
  assertEquals(servicePayment.parse({ ...base, text: base.text.replace('RD$ 200', '200') }), []);
  assertEquals(servicePayment.parse({ ...base, text: base.text.replace('04/09/2026 | 9:24 AM', 'ayer') }), []);
});
