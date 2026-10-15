import type { BankCode, ParsedTransaction, RawEmail } from '../parsers/index.ts';

/** Fila para `ingest_transactions` (claves iguales a las columnas de `transactions`). */
export interface IngestRow {
  message_id: string;
  bank_code: BankCode;
  type: ParsedTransaction['type'];
  amount: number;
  currency: ParsedTransaction['currency'];
  merchant: string | null;
  occurred_at: string;
  card_last4: string | null;
  reference: string | null;
  counterparty_last4: string | null;
  template_id: string;
}

export function toIngestRows(email: RawEmail, transactions: readonly ParsedTransaction[]): IngestRow[] {
  return transactions.map((tx) => ({
    message_id: `${email.messageId}#${tx.rowIndex}`,
    bank_code: tx.bankCode,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    merchant: tx.merchant,
    occurred_at: tx.occurredAt,
    card_last4: tx.cardLast4 ?? null,
    reference: tx.reference ?? null,
    counterparty_last4: tx.counterpartyLast4 ?? null,
    template_id: tx.templateId,
  }));
}

/** Correo de banco sin plantilla: la muestra para escribir el parser. */
export interface UnparsedEmail {
  message_id: string;
  bank_code: BankCode;
  subject: string;
  snippet: string;
  received_at: string;
}

/** En puntos de código, igual que `length()` de Postgres en el CHECK de `unparsed_emails.snippet`. */
export const SNIPPET_LENGTH = 500;

export function toUnparsed(email: RawEmail, bankCode: BankCode): UnparsedEmail {
  return {
    message_id: email.messageId,
    bank_code: bankCode,
    subject: email.subject,
    // Por puntos de código: un emoji partido deja un surrogate suelto que Postgres rechaza en jsonb.
    snippet: Array.from(email.text).slice(0, SNIPPET_LENGTH).join(''),
    received_at: email.receivedAt,
  };
}
