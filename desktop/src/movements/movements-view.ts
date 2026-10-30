import { isSameDate, monthStart, type LocalDate } from '@/lib/dates';
import { bucketRange } from '@/features/history/window';
import { DEFAULT_FILTERS, UNCATEGORIZED, type RangePeriod, type TransactionFilters } from '@/features/transactions/filters';
import type { BankCode } from '@/types/database';
import { monthTitle } from '../month/month-text';

export type MovementsScope =
  | { kind: 'month'; start: LocalDate }
  | { kind: 'range'; period: RangePeriod }
  | { kind: 'all' };

export interface MovementsView {
  scope: MovementsScope;
  /** Id de categoría o `UNCATEGORIZED`; null = todas. */
  categoryId: string | null;
  bankCode: BankCode | null;
  review: boolean;
}

/** El mes actual, sin filtros. */
export function defaultMovementsView(current: LocalDate): MovementsView {
  return { scope: { kind: 'month', start: monthStart(current) }, categoryId: null, bankCode: null, review: false };
}

/** Rango del mes con los límites dominicanos de las RPC, y su título. */
export function monthPeriod(start: LocalDate, timeZone: string): RangePeriod {
  return { kind: 'range', ...bucketRange('month', start, timeZone), label: monthTitle(start) };
}

export function toFilters(view: MovementsView, timeZone: string): TransactionFilters {
  const { scope } = view;
  const period = scope.kind === 'all' ? 'all' : scope.kind === 'range' ? scope.period : monthPeriod(scope.start, timeZone);
  return { ...DEFAULT_FILTERS, period, categoryId: view.categoryId, bankCode: view.bankCode, review: view.review };
}

/** null (una fila "Sin categoría") filtra los que no tienen categoría, no todos. */
export function categoryFilter(categoryId: string | null): string {
  return categoryId ?? UNCATEGORIZED;
}

export function viewForCategory(start: LocalDate, categoryId: string | null): MovementsView {
  return { ...defaultMovementsView(start), categoryId: categoryFilter(categoryId) };
}

/** El mes actual solo no cuenta como filtro. */
export function hasFilters(view: MovementsView, current: LocalDate): boolean {
  if (view.categoryId !== null || view.bankCode !== null || view.review) return true;
  return !(view.scope.kind === 'month' && isSameDate(monthStart(view.scope.start), monthStart(current)));
}
