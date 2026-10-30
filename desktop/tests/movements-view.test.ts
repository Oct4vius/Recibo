import { describe, expect, it } from 'vitest';
import { localDate } from '@/lib/dates';
import { DEFAULT_FILTERS, UNCATEGORIZED } from '@/features/transactions/filters';
import {
  categoryFilter,
  defaultMovementsView,
  hasFilters,
  monthPeriod,
  toFilters,
  viewForAllTime,
  viewForCategory,
  viewForPeriod,
} from '@desktop/movements/movements-view';

const tz = 'America/Santo_Domingo';
const oct = localDate(2026, 10, 1);
const sep = localDate(2026, 9, 1);
const base = defaultMovementsView(oct);

describe('movements view', () => {
  it('the month uses Dominican bounds, same as the RPCs', () => {
    expect(monthPeriod(oct, tz)).toEqual({
      kind: 'range',
      from: '2026-10-01T04:00:00.000Z',
      to: '2026-11-01T04:00:00.000Z',
      label: 'Octubre 2026',
    });
  });
  it('"Sin categoría" filters the uncategorized, not all', () => {
    expect(viewForCategory(oct, null).categoryId).toBe(UNCATEGORIZED);
    expect(categoryFilter(null)).toBe(UNCATEGORIZED);
    expect(categoryFilter('abc')).toBe('abc');
  });
  it('all history', () => {
    expect(toFilters({ ...base, scope: { kind: 'all' } }, tz)).toEqual({ ...DEFAULT_FILTERS, period: 'all' });
  });
  it('a month becomes a range period with filters', () => {
    expect(toFilters({ ...base, bankCode: 'bhd', review: true }, tz)).toEqual({
      ...DEFAULT_FILTERS,
      period: monthPeriod(oct, tz),
      bankCode: 'bhd',
      review: true,
    });
  });
  it('a range scope passes its period through', () => {
    const period = monthPeriod(sep, tz);
    expect(toFilters({ ...base, scope: { kind: 'range', period } }, tz).period).toEqual(period);
  });
  it('hasFilters: the current month alone is not a filter', () => {
    expect(hasFilters(defaultMovementsView(oct), oct)).toBe(false);
    expect(hasFilters({ ...base, scope: { kind: 'month', start: sep } }, oct)).toBe(true);
    expect(hasFilters({ ...base, bankCode: 'bhd' }, oct)).toBe(true);
    expect(hasFilters({ ...base, scope: { kind: 'all' } }, oct)).toBe(true);
  });
  it('a month opens with the month arrows', () =>
    expect(viewForPeriod('month', sep, undefined, tz).scope).toEqual({ kind: 'month', start: sep }));
  it('a week opens as a range with its title', () => {
    const { scope } = viewForPeriod('week', localDate(2026, 10, 5), undefined, tz);
    expect(scope).toMatchObject({ kind: 'range', period: { label: 'Semana del 5 al 11 de octubre' } });
  });
  it('undefined = no filter; null = uncategorized', () => {
    expect(viewForAllTime(undefined).categoryId).toBeNull();
    expect(viewForAllTime(null).categoryId).toBe(UNCATEGORIZED);
    expect(viewForPeriod('year', sep, 'abc', tz).categoryId).toBe('abc');
    expect(viewForPeriod('year', sep, null, tz).categoryId).toBe(UNCATEGORIZED);
  });
});
