import type { CategoryBreakdownData } from '@/features/history/categories';
import type { HistoryBucket } from '@/features/history/mapping';
import type { LocalDate } from '@/lib/dates';
import type { Currency } from '@/types/database';

export interface ReportItem {
  id: string;
  date: LocalDate;
  /** `null` = el banco no mandó comercio. */
  merchant: string | null;
  amount: number;
  currency: Currency;
  amountDop: number;
}

export interface ReportGroup {
  /** `null` = gastos sin categoría. */
  categoryId: string | null;
  name: string;
  totalDop: number;
  count: number;
  items: ReportItem[];
}

export interface MonthReport {
  groups: ReportGroup[];
  totalDop: number;
  count: number;
}

export interface YearReport {
  /** De `get_category_spending` del año. */
  categories: CategoryBreakdownData;
  /** 0..2 */
  largestUncategorized: ReportItem[];
  /** Enero hasta el último mes mostrado, vacíos en 0. */
  months: HistoryBucket[];
  /** = `categories.total` (`period_total`, calculado en SQL). */
  totalDop: number;
  /** Suma de `txCount` de las categorías (un conteo, no dinero). */
  count: number;
}

/** La lista llegó recortada o inconsistente: nunca se imprime una hoja incompleta. */
export class ReportIncompleteError extends Error {
  constructor(message = 'Month report rows do not match month_count') {
    super(message);
    this.name = 'ReportIncompleteError';
  }
}
