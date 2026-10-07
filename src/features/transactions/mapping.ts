import type { BankCode, Currency, Tables, TxSource } from '@/types/database';

/** Fila tal como la devuelve la consulta de la lista (con el nombre de la categoría embebido). */
export type TransactionRow = Pick<
  Tables<'transactions'>,
  'id' | 'amount' | 'currency' | 'merchant' | 'occurred_at' | 'category_id' | 'is_ignored' | 'source' | 'bank_code'
> & { categories: { name: string } | null };

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
  };
}

export interface RowPresentation {
  title: string;
  subtitle: string;
  badge?: string;
  muted: boolean;
}

/** Textos de la fila: comercio, categoría y una marca ("Ignorado" manda sobre "Manual"). */
export function presentRow(item: TransactionListItem): RowPresentation {
  return {
    title: item.merchant?.trim() || 'Sin descripción',
    subtitle: item.categoryName ?? 'Sin categoría',
    badge: item.isIgnored ? 'Ignorado' : item.source === 'manual' ? 'Manual' : undefined,
    muted: item.isIgnored,
  };
}
