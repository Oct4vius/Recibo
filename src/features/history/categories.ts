import { parseIsoDate, toIsoDate, type LocalDate } from '@/lib/dates';
import { UNCATEGORIZED } from '@/features/transactions/filters';
import type { TransactionRouteParams } from '@/features/transactions/route-params';
import type { Granularity } from './granularity';
import { addPeriods, bucketRange } from './window';

export interface CategorySpending {
  /** `null` = gastos sin categoría. */
  categoryId: string | null;
  name: string;
  totalDop: number;
  txCount: number;
}

export function toCategorySpending(row: {
  category_id: string | null;
  category_name: string | null;
  total_dop: number;
  tx_count: number;
}): CategorySpending {
  return {
    categoryId: row.category_id,
    name: row.category_name ?? 'Sin categoría',
    totalDop: row.total_dop,
    txCount: row.tx_count,
  };
}

/** Desglose de un rango: filas ordenadas y el total del rango, que la RPC calcula en SQL (0 sin filas). */
export interface CategoryBreakdownData {
  items: CategorySpending[];
  total: number;
}

type CategorySpendingRpcRow = Parameters<typeof toCategorySpending>[0] & { period_total: number };

/** Filas de la RPC a desglose ordenado. El total es `period_total` (igual en todas las filas), no una suma local. */
export function toCategoryBreakdown(rows: readonly CategorySpendingRpcRow[]): CategoryBreakdownData {
  return { items: sortCategorySpending(rows.map(toCategorySpending)), total: rows[0]?.period_total ?? 0 };
}

/** Mayor gasto primero; empate por nombre y luego id; "Sin categoría" siempre al final. */
export function sortCategorySpending(items: readonly CategorySpending[]): CategorySpending[] {
  return [...items].sort((a, b) => {
    if ((a.categoryId === null) !== (b.categoryId === null)) return a.categoryId === null ? 1 : -1;
    if (a.totalDop !== b.totalDop) return b.totalDop - a.totalDop;
    const byName = a.name.localeCompare(b.name, 'es');
    if (byName !== 0) return byName;
    return (a.categoryId ?? '').localeCompare(b.categoryId ?? '');
  });
}

/** Fracción 0..1 de `part` sobre `total` (0 sin total). */
export function shareOf(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

/** Rango de fechas locales `YYYY-MM-DD` (fin exclusivo) del período que empieza en `startIso`, para la RPC. */
export function breakdownRange(granularity: Granularity, startIso: string): { from: string; to: string } {
  const start = parseIsoDate(startIso);
  return { from: startIso, to: toIsoDate(addPeriods(granularity, start, 1)) };
}

export interface PeriodTarget {
  granularity: Granularity;
  start: LocalDate;
  label: string;
}

/**
 * Parámetros de ruta de Movimientos. `categoryId`: `undefined` = sin filtro de categoría,
 * `null` = sin categoría (`UNCATEGORIZED`).
 */
export function movementParams(
  target: PeriodTarget | 'all',
  categoryId: string | null | undefined,
  timeZone: string,
): TransactionRouteParams {
  const base: TransactionRouteParams =
    target === 'all'
      ? { period: 'all' }
      : { ...bucketRange(target.granularity, target.start, timeZone), label: target.label };
  if (categoryId === undefined) return base;
  return { ...base, categoryId: categoryId === null ? UNCATEGORIZED : categoryId };
}
