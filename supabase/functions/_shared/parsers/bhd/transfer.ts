import type { ParsedTransaction, RawEmail, Template } from '../types.ts';
import { cleanMerchant, keyValue, parseAmount, parseLocalDate } from '../normalize.ts';

const TEMPLATE_ID = 'bhd/transfer';
const SUBJECT = /^Transacciones entre productos BHD y a otros Bancos$/i;

const LABELS = {
  amount: /^Monto:/i,
  beneficiary: /^Beneficiario:/i,
  reference: /^N[uú]mero de confirmaci[oó]n:/i,
  date: /^Fecha y hora de la transacci[oó]n:/i,
  destination: /^Producto destino:/i,
};

export const transfer: Template = {
  id: TEMPLATE_ID,

  matches(email: RawEmail): boolean {
    return SUBJECT.test(email.subject.trim());
  },

  parse(email: RawEmail): ParsedTransaction[] {
    const lines = email.text.split('\n');

    const money = parseAmount(keyValue(lines, LABELS.amount) ?? '');
    const occurredAt = parseLocalDate(keyValue(lines, LABELS.date) ?? '');
    if (!money || !money.currency || !occurredAt) return [];

    const merchant = cleanMerchant(keyValue(lines, LABELS.beneficiary) ?? '');
    const reference = keyValue(lines, LABELS.reference) ?? '';
    const counterpartyLast4 = (keyValue(lines, LABELS.destination) ?? '').match(/(\d{4})\s*$/)?.[1];

    return [{
      bankCode: 'bhd',
      type: 'transfer_out',
      amount: money.amount,
      currency: money.currency,
      merchant,
      occurredAt,
      ...(reference ? { reference } : {}),
      ...(counterpartyLast4 ? { counterpartyLast4 } : {}),
      rowIndex: 0,
      templateId: TEMPLATE_ID,
    }];
  },
};
