import { sortCategorySpending } from '@/features/history/categories';
import { parseIsoDate } from '@/lib/dates';
import type { Database } from '@/types/database';
import { ReportIncompleteError, type MonthReport, type ReportGroup, type ReportItem } from './types';

type GeneratedRow = Database['public']['Functions']['get_month_report']['Returns'][number];

/** Fila de `get_month_report`; el SQL devuelve NULL en comercio y categoría aunque el tipo generado diga `string`. */
export type MonthReportRow = Omit<GeneratedRow, 'merchant' | 'category_id' | 'category_name'> & {
  merchant: string | null;
  category_id: string | null;
  category_name: string | null;
};

export function toReportItem(row: {
  tx_id: string;
  local_date: string;
  merchant: string | null;
  amount: number;
  currency: ReportItem['currency'];
  amount_dop: number;
}): ReportItem {
  return {
    id: row.tx_id,
    date: parseIsoDate(row.local_date),
    merchant: row.merchant,
    amount: row.amount,
    currency: row.currency,
    amountDop: row.amount_dop,
  };
}

/** Filas del mes a grupos por categoría (sin categoría al final). Los totales son los de SQL; una lista incompleta lanza. */
export function toMonthReport(rows: readonly MonthReportRow[]): MonthReport {
  if (rows.length === 0) return { groups: [], totalDop: 0, count: 0 };
  const { month_total, month_count } = rows[0];
  if (rows.length !== month_count) throw new ReportIncompleteError();

  const byCategory = new Map<string | null, ReportGroup>();
  for (const row of rows) {
    let group = byCategory.get(row.category_id);
    if (!group) {
      group = {
        categoryId: row.category_id,
        name: row.category_name ?? 'Sin categoría',
        totalDop: row.category_total,
        count: row.category_count,
        items: [],
      };
      byCategory.set(row.category_id, group);
    }
    group.items.push(toReportItem(row));
  }

  const sorted = sortCategorySpending(
    [...byCategory.values()].map((g) => ({ categoryId: g.categoryId, name: g.name, totalDop: g.totalDop, txCount: g.count })),
  );
  return { groups: sorted.map((s) => byCategory.get(s.categoryId)!), totalDop: month_total, count: month_count };
}
