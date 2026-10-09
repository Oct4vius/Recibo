import { supabase } from '@/lib/supabase';
import type { Currency } from '@/types/database';
import { periodRange, type TransactionFilters } from './filters';
import { toListItem, type TransactionListItem, type TransactionRow } from './mapping';

export const PAGE_SIZE = 50;

const LIST_COLUMNS = 'id, amount, currency, merchant, occurred_at, category_id, is_ignored, source, bank_code, type, counterparty_last4, categories(name)';

export interface TransactionPage {
  items: TransactionListItem[];
  count: number;
}

export async function fetchTransactionPage(
  filters: TransactionFilters,
  page: number,
  now: Date,
  timeZone: string,
): Promise<TransactionPage> {
  const range = periodRange(filters.period, now, timeZone);
  let query = supabase.from('transactions').select(LIST_COLUMNS, { count: 'exact' });
  if (range.from) query = query.gte('occurred_at', range.from);
  if (range.to) query = query.lt('occurred_at', range.to);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.currency) query = query.eq('currency', filters.currency);
  if (filters.bankCode) query = query.eq('bank_code', filters.bankCode);
  if (filters.review) query = query.eq('ignored_reason', 'unmatched_reversal');
  const from = page * PAGE_SIZE;
  const { data, error, count } = await query
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data as TransactionRow[]).map(toListItem), count: count ?? 0 };
}

export async function fetchRecentTransactions(limit: number): Promise<TransactionListItem[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(LIST_COLUMNS)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as TransactionRow[]).map(toListItem);
}

export interface NewExpense {
  amountCents: number;
  currency: Currency;
  merchant: string;
  categoryId: string | null;
  occurredAt: string;
}

export async function createExpense(expense: NewExpense, userId: string): Promise<void> {
  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    source: 'manual',
    type: 'card_purchase',
    amount: expense.amountCents / 100,
    currency: expense.currency,
    merchant: expense.merchant.trim() || null,
    category_id: expense.categoryId,
    occurred_at: expense.occurredAt,
  });
  if (error) throw error;
}

export interface ExpenseChanges {
  amountCents: number;
  merchant: string;
  categoryId: string | null;
  /** Solo gastos manuales: la moneda y la fecha de un importado son datos del banco. */
  currency?: Currency;
  occurredAt?: string;
}

export async function updateExpense(id: string, changes: ExpenseChanges): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({
      amount: changes.amountCents / 100,
      merchant: changes.merchant.trim() || null,
      category_id: changes.categoryId,
      ...(changes.currency ? { currency: changes.currency } : {}),
      ...(changes.occurredAt ? { occurred_at: changes.occurredAt } : {}),
    })
    .eq('id', id);
  if (error) throw error;
}

/** `is_ignored` e `ignored_reason` siempre juntos (CHECK `transactions_ignored_reason_shape`). */
export async function setIgnored(id: string, ignored: boolean): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ is_ignored: ignored, ignored_reason: ignored ? 'user' : null })
    .eq('id', id);
  if (error) throw error;
}

/** Solo borra gastos manuales (la política RLS ya lo impide para los de correo). */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('source', 'manual');
  if (error) throw error;
}
