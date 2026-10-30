import type { IgnoredEmail, RawEmail } from '../types.ts';

const SUBJECT = /^C[oó]digo de validaci[oó]n de compra$/i;
const SENDER = /@(?:[a-z0-9-]+\.)*bhd\.com\.do>?$/i;

/** Código de validación (OTP) de una compra: no es un gasto; solo lee remitente y asunto. */
export const purchaseCode: IgnoredEmail = {
  id: 'bhd/purchase-code',

  matches(email: RawEmail): boolean {
    return SENDER.test(email.from.trim()) && SUBJECT.test(email.subject.trim());
  },
};
