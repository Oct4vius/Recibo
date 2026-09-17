import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { emlToRawEmail } from '../../../scripts/lib/eml.ts';

describe('emlToRawEmail', () => {
  it('decodes a real BHD .eml into a normalized RawEmail', async () => {
    const bytes = await readFile('fixtures-raw/bhd/card-purchase-approved.eml');
    const email = await emlToRawEmail(new Uint8Array(bytes));

    expect(email.messageId).toBe('<6a7c5000-b764-0f60-1899-3acb831f0358@bhd.com.do>');
    expect(email.from).toBe('Alertas@bhd.com.do');
    expect(email.subject).toBe('BHD Notificación de Transacciones');
    expect(email.receivedAt).toBe('2026-09-17T02:43:15.000Z');
    expect(email.text).toContain('Visa Débito Intl # 1234');
    expect(email.text).toContain('Fecha | Moneda | Monto | Comercio | Estado | Tipo');
    expect(email.text).toContain('16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra');
  });

  it('keeps the empty merchant cell of a reversed purchase', async () => {
    const bytes = await readFile('fixtures-raw/bhd/card-purchase-reversed.eml');
    const email = await emlToRawEmail(new Uint8Array(bytes));
    expect(email.text).toContain('16/09/2026 09:31 pm | RD | $434.22 | | Reversada | Compra');
  });

  it('throws when the .eml has no Message-ID header instead of silently writing an empty string', async () => {
    const raw = [
      'From: Alertas@bhd.com.do',
      'Subject: BHD Notificación de Transacciones',
      'Date: Wed, 16 Sep 2026 22:43:15 -0400',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>x</p>',
      '',
    ].join('\r\n');
    await expect(emlToRawEmail(new TextEncoder().encode(raw))).rejects.toThrow(/Message-ID/);
  });

  it('throws when the .eml has no Date header instead of silently writing an empty string', async () => {
    const raw = [
      'From: Alertas@bhd.com.do',
      'Subject: BHD Notificación de Transacciones',
      'Message-ID: <no-date@bhd.com.do>',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>x</p>',
      '',
    ].join('\r\n');
    await expect(emlToRawEmail(new TextEncoder().encode(raw))).rejects.toThrow(/Date/);
  });
});
