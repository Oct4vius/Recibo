import type { ParsedTransaction, RawEmail, Template } from '../types.ts';
import { cleanMerchant, parseAmount, parseLocalDate } from '../normalize.ts';

const TEMPLATE_ID = 'bhd/transfer';
const SUBJECT = /^Transacciones entre productos BHD y a otros Bancos$/i;

const LABELS = {
  amount: /^Monto:/i,
  beneficiary: /^Beneficiario:/i,
  reference: /^N[uú]mero de confirmaci[oó]n:/i,
  date: /^Fecha y hora de la transacci[oó]n:/i,
  destination: /^Producto destino:/i,
};

/**
 * Valor de una fila clave-valor. Tolera dos formas que produce htmlToText:
 *   "Monto: | RD$ 3,500.00"   → "RD$ 3,500.00"
 *   "Monto:"  (valor vacío)   → ""
 *   "Monto:" seguido del valor en la línea siguiente (tabla anidada) → esa línea
 */
function kv(lines: string[], label: RegExp): string | null {
  const index = lines.findIndex((line) => label.test(line));
  if (index === -1) return null;
  const line = lines[index];
  const pipe = line.indexOf('|');
  if (pipe !== -1) return line.slice(pipe + 1).trim();
  const inline = line.replace(label, '').trim();
  if (inline.length > 0) return inline;
  const next = lines[index + 1] ?? '';
  const nextIsLabel = Object.values(LABELS).some((re) => re.test(next)) || /^[^|]+:$/.test(next);
  return nextIsLabel ? '' : next.trim();
}

export const transfer: Template = {
  id: TEMPLATE_ID,

  matches(email: RawEmail): boolean {
    return SUBJECT.test(email.subject.trim());
  },

  parse(email: RawEmail): ParsedTransaction[] {
    const lines = email.text.split('\n');

    const money = parseAmount(kv(lines, LABELS.amount) ?? '');
    const occurredAt = parseLocalDate(kv(lines, LABELS.date) ?? '');
    if (!money || !money.currency || !occurredAt) return [];

    const merchant = cleanMerchant(kv(lines, LABELS.beneficiary) ?? '');
    const reference = (kv(lines, LABELS.reference) ?? '').trim();
    const counterpartyLast4 = (kv(lines, LABELS.destination) ?? '').match(/(\d{4})\s*$/)?.[1];

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
