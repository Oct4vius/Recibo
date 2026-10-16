import type { DopEquivalent } from '@/features/rates/text';
import type { BankCode, Currency, IgnoredReason, Tables, TxSource, TxType } from '@/types/database';

/** Fila tal como la devuelve la consulta de la lista (con el nombre de la categoría embebido). */
export type TransactionRow = Pick<
  Tables<'transactions'>,
  'id' | 'amount' | 'currency' | 'merchant' | 'occurred_at' | 'category_id' | 'is_ignored' | 'source' | 'bank_code' | 'type' | 'counterparty_last4' | 'ignored_reason' | 'reviewed_at'
> &
  Pick<Tables<'transactions_with_rate'>, 'amount_dop' | 'usd_rate' | 'usd_rate_date' | 'usd_rate_origin'> & { categories: { name: string } | null };

export interface TransactionListItem {
  id: string;
  amount: number;
  currency: Currency;
  merchant: string | null;
  occurredAt: string;
  categoryId: string | null;
  categoryName: string | null;
  isIgnored: boolean;
  source: TxSource;
  bankCode: BankCode | null;
  type: TxType;
  /** Últimos 4 de la cuenta destino (transferencias del banco). */
  counterpartyLast4: string | null;
  /** Por qué no cuenta (null si cuenta). */
  ignoredReason: IgnoredReason | null;
  /** Reversa sin emparejar ya revisada por el usuario. */
  reviewedAt: string | null;
  /** Equivalente en pesos de un gasto en USD con la tasa que usó la base; null si no hay (DOP o sin tasa). */
  dopEquivalent: DopEquivalent | null;
}

/** Solo los gastos en USD traen equivalente; la base ya calculó el monto y la tasa (la app nunca multiplica). */
function toDopEquivalent(row: TransactionRow): DopEquivalent | null {
  if (row.currency !== 'USD' || row.amount_dop === null || row.usd_rate === null || row.usd_rate_origin === null) return null;
  return { amountDop: row.amount_dop, rate: row.usd_rate, rateDate: row.usd_rate_date, origin: row.usd_rate_origin };
}

export function toListItem(row: TransactionRow): TransactionListItem {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    merchant: row.merchant,
    occurredAt: row.occurred_at,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    isIgnored: row.is_ignored,
    source: row.source,
    bankCode: row.bank_code,
    type: row.type,
    counterpartyLast4: row.counterparty_last4,
    ignoredReason: row.ignored_reason,
    reviewedAt: row.reviewed_at,
    dopEquivalent: toDopEquivalent(row),
  };
}

export interface RowPresentation {
  title: string;
  subtitle: string;
  badge?: string;
  muted: boolean;
  /** Monto a mostrar: negativo en reversas. */
  amount: number;
  /** Equivalente en pesos de un gasto en USD, con el mismo signo que `amount`. */
  approxDop?: number;
}

/** Textos de la fila: comercio, categoría y una marca ("Reversa" > "Ignorado" > "Manual"). */
export function presentRow(item: TransactionListItem): RowPresentation {
  const reversal = item.type === 'card_reversal';
  return {
    title: item.merchant?.trim() || (reversal ? 'Reversa' : 'Sin descripción'),
    subtitle: item.categoryName ?? 'Sin categoría',
    badge: reversal ? 'Reversa' : item.isIgnored ? 'Ignorado' : item.source === 'manual' ? 'Manual' : undefined,
    muted: item.isIgnored,
    amount: reversal ? -item.amount : item.amount,
    approxDop: item.dopEquivalent ? (reversal ? -item.dopEquivalent.amountDop : item.dopEquivalent.amountDop) : undefined,
  };
}
