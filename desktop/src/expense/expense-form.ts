import { textToCents } from '@/features/transactions/amount-input';
import type { ExpenseChanges, NewExpense } from '@/features/transactions/api';
import { draftToChanges, draftFromItem, type ExpenseDraft } from '@/features/transactions/expense-draft';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { parseIsoDate, toIsoDate, toLocalDate, zonedInstant } from '@/lib/dates';
import type { Currency, TxSource } from '@/types/database';
import { isAmountText } from '../ui/amount-text';

export interface ExpenseForm {
  amountText: string;
  currency: Currency;
  merchant: string;
  categoryId: string | null;
  /** YYYY-MM-DD, fecha local en la zona del perfil. */
  date: string;
}

/** `todayIso` es hoy (YYYY-MM-DD) en la zona del perfil; las fechas ISO se comparan como texto. */
export function canSaveExpense(form: Pick<ExpenseForm, 'amountText' | 'currency' | 'date'>, todayIso: string): boolean {
  return isAmountText(form.amountText) && form.date !== '' && form.date <= todayIso;
}

/** El gasto cae a las 12:00 del día elegido en la zona del perfil. */
export function toNewExpense(form: ExpenseForm, timeZone: string): NewExpense {
  return {
    amountCents: textToCents(form.amountText),
    currency: form.currency,
    merchant: form.merchant.trim(),
    categoryId: form.categoryId,
    occurredAt: zonedInstant(parseIsoDate(form.date), 12 * 60, timeZone).toISOString(),
  };
}

/** El formulario de un movimiento existente, con la fecha local en la zona del perfil. */
export function formFromItem(item: TransactionListItem, timeZone: string): ExpenseForm {
  const draft = draftFromItem(item, new Date(), timeZone);
  return {
    amountText: draft.amountText,
    currency: draft.currency,
    merchant: draft.merchant,
    categoryId: draft.categoryId,
    date: toIsoDate(toLocalDate(new Date(item.occurredAt), timeZone)),
  };
}

function toDraft(form: ExpenseForm): ExpenseDraft {
  return { ...form, date: { kind: 'other', date: parseIsoDate(form.date) } };
}

/** Cambios a guardar: la regla de qué se envía (importado vs. manual, fecha) vive en `draftToChanges`. */
export function toExpenseChanges(form: ExpenseForm, original: ExpenseForm, source: TxSource, now: Date, timeZone: string): ExpenseChanges {
  return draftToChanges(toDraft(form), toDraft(original), source, now, timeZone);
}
