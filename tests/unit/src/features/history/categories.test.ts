import { describe, expect, it } from 'vitest';
import { breakdownRange, movementParams, shareOf, sortCategorySpending, toCategorySpending } from '@/features/history/categories';
import { localDate } from '@/lib/dates';

const TZ = 'America/Santo_Domingo';
const a = { categoryId: 'b-id', name: 'Comida', totalDop: 600, txCount: 1 };
const b = { categoryId: 'a-id', name: 'Comida', totalDop: 600, txCount: 2 };
const none = { categoryId: null, name: 'Sin categoría', totalDop: 5000, txCount: 5 };
const top = { categoryId: 'c-id', name: 'Supermercado', totalDop: 1500, txCount: 2 };

describe('sortCategorySpending', () => {
  it('orders by total, then name, then id, with uncategorized last', () => {
    expect(sortCategorySpending([none, a, top, b]).map((i) => i.categoryId)).toEqual(['c-id', 'a-id', 'b-id', null]);
  });
  it('does not mutate its input', () => {
    const input = [none, top];
    sortCategorySpending(input);
    expect(input).toEqual([none, top]);
  });
});

describe('toCategorySpending', () => {
  it('names the uncategorized row', () => {
    expect(toCategorySpending({ category_id: null, category_name: null, total_dop: 250, tx_count: 1 })).toEqual({
      categoryId: null,
      name: 'Sin categoría',
      totalDop: 250,
      txCount: 1,
    });
  });
  it('keeps a real category', () => {
    expect(toCategorySpending({ category_id: 'x', category_name: 'Comida', total_dop: 10, tx_count: 2 }).name).toBe('Comida');
  });
});

describe('shareOf', () => {
  it('is a 0..1 fraction and 0 without a total', () => {
    expect(shareOf(0, 0)).toBe(0);
    expect(shareOf(250, 1000)).toBe(0.25);
  });
});

describe('breakdownRange', () => {
  it('returns local ISO dates with an exclusive end', () => {
    expect(breakdownRange('month', '2026-10-01')).toEqual({ from: '2026-10-01', to: '2026-11-01' });
    expect(breakdownRange('week', '2026-10-26')).toEqual({ from: '2026-10-26', to: '2026-11-02' });
    expect(breakdownRange('year', '2026-01-01')).toEqual({ from: '2026-01-01', to: '2027-01-01' });
  });
});

describe('movementParams', () => {
  it('maps "all" and the category filter', () => {
    expect(movementParams('all', null, TZ)).toEqual({ period: 'all', categoryId: 'none' });
    expect(movementParams('all', undefined, TZ)).toEqual({ period: 'all' });
    expect(movementParams('all', 'c-id', TZ)).toEqual({ period: 'all', categoryId: 'c-id' });
  });
  it('maps a period to instants in the profile zone', () => {
    const target = { granularity: 'month' as const, start: localDate(2026, 10, 1), label: 'OCTUBRE 2026' };
    expect(movementParams(target, 'c-id', TZ)).toEqual({
      from: '2026-10-01T04:00:00.000Z',
      to: '2026-11-01T04:00:00.000Z',
      label: 'OCTUBRE 2026',
      categoryId: 'c-id',
    });
    expect('categoryId' in movementParams(target, undefined, TZ)).toBe(false);
    expect(movementParams(target, null, TZ).categoryId).toBe('none');
  });
});
