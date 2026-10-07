import { addDays, isSameDate, toLocalDate } from '@/lib/dates';
import type { Currency, TxSource } from '@/types/database';
import { centsToText, textToCents } from './amount-input';
import type { ExpenseChanges, NewExpense } from './api';
import { occurredAtFor, type DateChoice } from './expense-date';
import type { TransactionListItem } from './mapping';

/** Lo que el usuario tiene escrito en el panel de gasto. */
export interface ExpenseDraft {
  amountText: string;
  currency: Currency;
  merchant: string;
  categoryId: string | null;
  date: DateChoice;
}

export function emptyDraft(currency: Currency): ExpenseDraft {
  return { amountText: '', currency, merchant: '', categoryId: null, date: { kind: 'today' } };
}

/** Fecha de un movimiento existente como Hoy / Ayer / otro día, en la zona del perfil. */
export function dateChoiceOf(occurredAt: string, now: Date, timeZone: string): DateChoice {
  const date = toLocalDate(new Date(occurredAt), timeZone);
  const today = toLocalDate(now, timeZone);
  if (isSameDate(date, today)) return { kind: 'today' };
  if (isSameDate(date, addDays(today, -1))) return { kind: 'yesterday' };
  return { kind: 'other', date };
}

export function draftFromItem(item: TransactionListItem, now: Date, timeZone: string): ExpenseDraft {
  return {
    amountText: centsToText(Math.round(item.amount * 100)),
    currency: item.currency,
    merchant: item.merchant ?? '',
    categoryId: item.categoryId,
    date: dateChoiceOf(item.occurredAt, now, timeZone),
  };
}

export function canSave(draft: ExpenseDraft): boolean {
  return textToCents(draft.amountText) > 0;
}

export function draftToNewExpense(draft: ExpenseDraft, now: Date, timeZone: string): NewExpense {
  return {
    amountCents: textToCents(draft.amountText),
    currency: draft.currency,
    merchant: draft.merchant,
    categoryId: draft.categoryId,
    occurredAt: occurredAtFor(draft.date, now, timeZone),
  };
}

function sameChoice(a: DateChoice, b: DateChoice): boolean {
  if (a.kind === 'other' && b.kind === 'other') return isSameDate(a.date, b.date);
  return a.kind === b.kind;
}

/**
 * Cambios a guardar al editar. La moneda y la fecha solo se envían en gastos manuales (en los importados
 * son datos del banco); la fecha solo si el usuario cambió el día, para conservar la hora original.
 */
export function draftToChanges(
  draft: ExpenseDraft,
  original: ExpenseDraft,
  source: TxSource,
  now: Date,
  timeZone: string,
): ExpenseChanges {
  const base = { amountCents: textToCents(draft.amountText), merchant: draft.merchant, categoryId: draft.categoryId };
  if (source !== 'manual') return base;
  return {
    ...base,
    currency: draft.currency,
    ...(sameChoice(draft.date, original.date) ? {} : { occurredAt: occurredAtFor(draft.date, now, timeZone) }),
  };
}
