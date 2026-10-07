import { addDays, monthStart, nextMonthStart, toLocalDate, weekStart, zonedInstant } from '@/lib/dates';
import type { BankCode, Currency } from '@/types/database';

export type Period = 'week' | 'month' | 'all';

export interface TransactionFilters {
  period: Period;
  categoryId: string | null;
  currency: Currency | null;
  bankCode: BankCode | null;
  /** Solo reversas sin emparejar (las que el usuario debe revisar). */
  review: boolean;
}

export const DEFAULT_FILTERS: TransactionFilters = { period: 'month', categoryId: null, currency: null, bankCode: null, review: false };

export const PERIOD_LABELS: Record<Period, string> = { week: 'Esta semana', month: 'Este mes', all: 'Todo' };
export const BANK_LABELS: Record<BankCode, string> = { bhd: 'BHD', banreservas: 'Banreservas', popular: 'Popular', apap: 'APAP' };
export const CURRENCY_LABELS: Record<Currency, string> = { DOP: 'RD$', USD: 'US$' };

export interface DateRange {
  from: string | null;
  /** Exclusivo. */
  to: string | null;
}

/** Rango del período en la zona del perfil, con las mismas reglas que las RPC (semana desde el lunes). */
export function periodRange(period: Period, now: Date, timeZone: string): DateRange {
  if (period === 'all') return { from: null, to: null };
  const today = toLocalDate(now, timeZone);
  const start = period === 'week' ? weekStart(today) : monthStart(today);
  const end = period === 'week' ? addDays(start, 7) : nextMonthStart(today);
  return { from: zonedInstant(start, 0, timeZone).toISOString(), to: zonedInstant(end, 0, timeZone).toISOString() };
}
