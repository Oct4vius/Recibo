import type { ParsedTransaction, RawEmail, Template, TxType } from '../types.ts';
import { cleanMerchant, currencyFromCode, parseAmount, parseLocalDate, splitCells } from '../normalize.ts';

const TEMPLATE_ID = 'bhd/transactions-table';
const SUBJECT = /^BHD Notificaci[oó]n de Transacciones$/i;
const HEADER_ROW = /^Fecha \| Moneda \| Monto \| Comercio \| Estado \| Tipo$/i;
const CARD_LAST4 = /#\s*(\d{4})\b/;
const COLUMNS = 6;

/** Solo combinaciones vistas en correos reales. Cualquier otra → null → correo completo a unparsed_emails. */
function mapType(status: string, kind: string): TxType | null {
  const s = status.toLowerCase();
  const k = kind.toLowerCase();
  if (k === 'compra' && s === 'aprobada') return 'card_purchase';
  if (k === 'compra' && s === 'reversada') return 'card_reversal';
  return null;
}

function parseRow(cells: string[], rowIndex: number, cardLast4: string | undefined): ParsedTransaction | null {
  const [dateRaw, currencyRaw, amountRaw, merchantRaw, statusRaw, kindRaw] = cells;
  const type = mapType(statusRaw, kindRaw);
  const occurredAt = parseLocalDate(dateRaw);
  const currency = currencyFromCode(currencyRaw);
  const money = parseAmount(amountRaw);
  if (!type || !occurredAt || !currency || !money) return null;

  return {
    bankCode: 'bhd',
    type,
    amount: money.amount,
    currency,
    merchant: cleanMerchant(merchantRaw),
    occurredAt,
    ...(cardLast4 ? { cardLast4 } : {}),
    rowIndex,
    templateId: TEMPLATE_ID,
  };
}

export const transactionsTable: Template = {
  id: TEMPLATE_ID,

  matches(email: RawEmail): boolean {
    return SUBJECT.test(email.subject.trim());
  },

  parse(email: RawEmail): ParsedTransaction[] {
    const lines = email.text.split('\n');
    const headerIndex = lines.findIndex((line) => HEADER_ROW.test(line));
    if (headerIndex === -1) return [];

    const cardLast4 = lines.slice(0, headerIndex).join(' ').match(CARD_LAST4)?.[1];

    const transactions: ParsedTransaction[] = [];
    for (const line of lines.slice(headerIndex + 1)) {
      const cells = splitCells(line);
      if (cells.length !== COLUMNS) break; // fin de la tabla
      const tx = parseRow(cells, transactions.length, cardLast4);
      if (!tx) return []; // todo o nada
      transactions.push(tx);
    }
    return transactions;
  },
};
