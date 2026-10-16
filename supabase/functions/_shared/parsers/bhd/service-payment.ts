import type { ParsedTransaction, RawEmail, Template } from '../types.ts';
import { cleanMerchant, keyValue, parseAmount, parseLocalDate } from '../normalize.ts';

const TEMPLATE_ID = 'bhd/service-payment';
const SUBJECT = /^Pago de Servicio e Impuestos$/i;

const LABELS = {
  amount: /^Monto:/i,
  provider: /^Proveedor del servicio:/i,
  reference: /^N[uú]mero de confirmaci[oó]n:/i,
  date: /^Fecha y hora de la transacci[oó]n:/i,
};

/** Pago de un servicio (telefonía, impuestos): una sola fila, cargada a la cuenta como `transfer_out`. */
export const servicePayment: Template = {
  id: TEMPLATE_ID,

  matches(email: RawEmail): boolean {
    return SUBJECT.test(email.subject.trim());
  },

  parse(email: RawEmail): ParsedTransaction[] {
    const lines = email.text.split('\n');

    const money = parseAmount(keyValue(lines, LABELS.amount) ?? '');
    const occurredAt = parseLocalDate(keyValue(lines, LABELS.date) ?? '');
    if (!money || !money.currency || !occurredAt) return [];

    const merchant = cleanMerchant(keyValue(lines, LABELS.provider) ?? '');
    const reference = keyValue(lines, LABELS.reference) ?? '';

    return [{
      bankCode: 'bhd',
      type: 'transfer_out',
      amount: money.amount,
      currency: money.currency,
      merchant,
      occurredAt,
      ...(reference ? { reference } : {}),
      rowIndex: 0,
      templateId: TEMPLATE_ID,
    }];
  },
};
