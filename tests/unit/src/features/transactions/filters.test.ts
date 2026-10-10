import { describe, expect, it } from 'vitest';
import { countLabel, DEFAULT_FILTERS, emptyMessage, periodRange } from '@/features/transactions/filters';

const SD = 'America/Santo_Domingo';

describe('periodRange', () => {
  // martes 6 de octubre de 2026, 11:00 en Santo Domingo
  const now = new Date('2026-10-06T15:00:00Z');

  it('covers Monday 00:00 to next Monday 00:00 in the profile zone for "week"', () => {
    expect(periodRange('week', now, SD)).toEqual({ from: '2026-10-05T04:00:00.000Z', to: '2026-10-12T04:00:00.000Z' });
  });
  it('covers the first day of the month to the first of the next for "month"', () => {
    expect(periodRange('month', now, SD)).toEqual({ from: '2026-10-01T04:00:00.000Z', to: '2026-11-01T04:00:00.000Z' });
  });
  it('crosses the year boundary', () => {
    // 31 de diciembre, 19:00 en Santo Domingo
    expect(periodRange('month', new Date('2026-12-31T23:00:00Z'), SD)).toEqual({
      from: '2026-12-01T04:00:00.000Z',
      to: '2027-01-01T04:00:00.000Z',
    });
  });
  it('has no bounds for "all"', () => {
    expect(periodRange('all', now, SD)).toEqual({ from: null, to: null });
  });
  it('defaults to this month with no other filter', () => {
    expect(DEFAULT_FILTERS).toEqual({ period: 'month', categoryId: null, currency: null, bankCode: null, review: false });
  });
});

describe('countLabel', () => {
  it('pluralizes and groups thousands', () => {
    expect(countLabel(0)).toBe('0 movimientos');
    expect(countLabel(1)).toBe('1 movimiento');
    expect(countLabel(38)).toBe('38 movimientos');
    expect(countLabel(1234)).toBe('1,234 movimientos');
  });
});

describe('emptyMessage', () => {
  it('invites to add the first expense when nothing limits the list', () => {
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: 'all' })).toBe('Todavía no hay movimientos. Agrega tu primer gasto con +');
  });
  it('names the period when only the period limits the list', () => {
    expect(emptyMessage(DEFAULT_FILTERS)).toBe('No hay movimientos este mes. Agrega uno con +');
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: 'week' })).toBe('No hay movimientos esta semana. Agrega uno con +');
  });
  it('points at the filters when any other filter is on', () => {
    expect(emptyMessage({ ...DEFAULT_FILTERS, review: true })).toBe('No hay movimientos con estos filtros.');
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: 'all', currency: 'USD' })).toBe('No hay movimientos con estos filtros.');
  });
});

describe('range periods', () => {
  const range = { kind: 'range', from: '2026-09-28T04:00:00.000Z', to: '2026-10-05T04:00:00.000Z', label: '28 SEP – 04 OCT' } as const;
  it('uses the range bounds as they are', () => {
    expect(periodRange(range, new Date('2026-10-06T15:00:00Z'), SD)).toEqual({ from: range.from, to: range.to });
  });
  it('has its own empty message', () => {
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: range })).toBe('No hay movimientos en este período.');
  });
  it('still points at the filters when another filter is on', () => {
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: range, currency: 'USD' })).toBe('No hay movimientos con estos filtros.');
  });
});
