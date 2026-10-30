import { MAX_INTEGER_DIGITS, textToCents } from '@/features/transactions/amount-input';
import type { NewExpense } from '@/features/transactions/api';
import { parseIsoDate, zonedInstant } from '@/lib/dates';
import type { Currency } from '@/types/database';

export interface ExpenseForm {
  amountText: string;
  currency: Currency;
  merchant: string;
  categoryId: string | null;
  /** YYYY-MM-DD, fecha local en la zona del perfil. */
  date: string;
}

const AMOUNT_SHAPE = new RegExp(`^\\d{1,${MAX_INTEGER_DIGITS}}(\\.\\d{0,2})?$`);

/** Deja pasar solo dígitos y un punto (lo demás se descarta al escribir o pegar). */
export function sanitizeAmountText(text: string): string {
  const cleaned = text.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

/** `todayIso` es hoy (YYYY-MM-DD) en la zona del perfil; las fechas ISO se comparan como texto. */
export function canSaveExpense(form: Pick<ExpenseForm, 'amountText' | 'currency' | 'date'>, todayIso: string): boolean {
  if (!AMOUNT_SHAPE.test(form.amountText) || form.date === '' || form.date > todayIso) return false;
  return textToCents(form.amountText) > 0;
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
