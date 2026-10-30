import { assertEquals } from 'jsr:@std/assert@1';
import { purchaseCode } from './purchase-code.ts';
import { parseEmail } from '../index.ts';
import type { RawEmail } from '../types.ts';

const otp = (overrides: Partial<RawEmail> = {}): RawEmail => ({
  messageId: 'otp-1',
  from: 'Alertas@bhd.com.do',
  subject: 'Código de validación de compra',
  text: 'Su código de validación es 000000',
  receivedAt: '2026-10-01T12:00:00Z',
  ...overrides,
});

Deno.test('bhd/purchase-code — matches the OTP email, accent-insensitive and trimmed', () => {
  assertEquals(purchaseCode.matches(otp()), true);
  assertEquals(purchaseCode.matches(otp({ subject: '  Codigo de validacion de compra ' })), true);
});

Deno.test('bhd/purchase-code — does not match other subjects or senders', () => {
  assertEquals(purchaseCode.matches(otp({ subject: 'BHD Notificación de Transacciones' })), false);
  assertEquals(purchaseCode.matches(otp({ from: 'someone@example.com' })), false);
});

Deno.test('bhd/purchase-code — parseEmail ignores it', () => {
  assertEquals(parseEmail(otp()), { kind: 'ignored', bankCode: 'bhd' });
});
