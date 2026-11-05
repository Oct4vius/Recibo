import { describe, expect, it } from 'vitest';
import { toMonthReport, toReportItem } from '@/features/reports/mapping';
import { ReportIncompleteError } from '@/features/reports/types';
import type { MonthReportRow } from '@/features/reports/mapping';

function row(over: Partial<MonthReportRow>): MonthReportRow {
  return {
    tx_id: 'tx',
    local_date: '2026-10-01',
    merchant: 'Comercio',
    category_id: null,
    category_name: null,
    amount: 100,
    currency: 'DOP',
    amount_dop: 100,
    category_total: 0,
    category_count: 0,
    month_total: 3370,
    month_count: 6,
    ...over,
  };
}

const sup = { category_id: 's', category_name: 'Supermercado', category_total: 1620, category_count: 3 };
const food = { category_id: 'c', category_name: 'Comida', category_total: 600, category_count: 1 };
const none = { category_id: null, category_name: null, category_total: 1150, category_count: 2 };

const rows = [
  row({ tx_id: '1', ...sup, amount: 500, amount_dop: 500 }),
  row({ tx_id: '2', ...none, merchant: null, amount: 1000, amount_dop: 1000 }),
  row({ tx_id: '3', ...sup, amount: 520, amount_dop: 520 }),
  row({ tx_id: '4', ...food, amount: 10, currency: 'USD', amount_dop: 600 }),
  row({ tx_id: '5', ...sup, amount: 400, amount_dop: 400 }),
  row({ tx_id: '6', ...none, amount: 150, amount_dop: 150 }),
];

describe('toMonthReport', () => {
  it('returns an empty report for no rows', () => {
    expect(toMonthReport([])).toEqual({ groups: [], totalDop: 0, count: 0 });
  });

  it('groups by category with uncategorized last and keeps SQL totals', () => {
    const report = toMonthReport(rows);
    expect(report.groups.map((g) => g.name)).toEqual(['Supermercado', 'Comida', 'Sin categoría']);
    expect(report.groups.map((g) => g.categoryId)).toEqual(['s', 'c', null]);
    expect(report.totalDop).toBe(3370);
    expect(report.count).toBe(6);
    expect(report.groups[0].items.map((i) => i.id)).toEqual(['1', '3', '5']);
    expect(report.groups[2].items.map((i) => i.id)).toEqual(['2', '6']);
    expect(report.groups[1].items[0]).toMatchObject({ currency: 'USD', amount: 10, amountDop: 600 });
  });

  it('uses the SQL category_total, not a local sum', () => {
    const odd = rows.map((r) => (r.category_id === 's' ? { ...r, category_total: 1700 } : r));
    expect(toMonthReport(odd).groups[0].totalDop).toBe(1700);
    expect(toMonthReport(odd).groups[0].count).toBe(3);
  });

  describe('regression — a cut list never prints', () => {
    it('throws when fewer rows than month_count arrive', () => {
      expect(() => toMonthReport(rows.slice(0, 5))).toThrow(ReportIncompleteError);
    });
    it('throws when more rows than month_count arrive', () => {
      expect(() => toMonthReport([...rows, row({ tx_id: '7' })])).toThrow(ReportIncompleteError);
    });
  });
});

describe('toReportItem', () => {
  it('parses the local date and keeps a null merchant', () => {
    expect(
      toReportItem({ tx_id: 'a', local_date: '2026-10-31', merchant: null, amount: 5, currency: 'DOP', amount_dop: 5 }),
    ).toEqual({ id: 'a', date: { year: 2026, month: 10, day: 31, weekday: 6 }, merchant: null, amount: 5, currency: 'DOP', amountDop: 5 });
  });
});
