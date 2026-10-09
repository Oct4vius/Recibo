import { describe, expect, it } from 'vitest';
import { axisLabels, bucketAccessibilityLabel, bucketLabel, expenseCountLabel } from '@/features/history/labels';
import { localDate } from '@/lib/dates';

describe('bucketLabel', () => {
  it('labels a week, a month and a year', () => {
    expect(bucketLabel('week', localDate(2026, 10, 5))).toBe('05 OCT – 11 OCT');
    expect(bucketLabel('week', localDate(2026, 9, 28))).toBe('28 SEP – 04 OCT');
    expect(bucketLabel('month', localDate(2026, 10, 1))).toBe('OCTUBRE 2026');
    expect(bucketLabel('year', localDate(2026, 1, 1))).toBe('2026');
  });
});

describe('axisLabels', () => {
  it('shows the day for weeks and the month only when it changes', () => {
    expect(axisLabels('week', [localDate(2026, 9, 21), localDate(2026, 9, 28), localDate(2026, 10, 5)])).toEqual([
      { top: '21', bottom: 'SEP' },
      { top: '28', bottom: '' },
      { top: '05', bottom: 'OCT' },
    ]);
  });
  it('shows the month and the year only when it changes', () => {
    expect(axisLabels('month', [localDate(2025, 12, 1), localDate(2026, 1, 1), localDate(2026, 2, 1)])).toEqual([
      { top: 'DIC', bottom: '2025' },
      { top: 'ENE', bottom: '2026' },
      { top: 'FEB', bottom: '' },
    ]);
  });
  it('shows only the year for years', () => {
    expect(axisLabels('year', [localDate(2025, 1, 1), localDate(2026, 1, 1)])).toEqual([
      { top: '2025', bottom: '' },
      { top: '2026', bottom: '' },
    ]);
  });
});

describe('bucketAccessibilityLabel', () => {
  it('reads the period and the amount in pesos', () => {
    expect(bucketAccessibilityLabel('week', localDate(2026, 10, 5), 4275.72)).toBe('Semana del 5 de octubre: 4,275.72 pesos');
    expect(bucketAccessibilityLabel('month', localDate(2026, 10, 1), 0)).toBe('Octubre de 2026: 0.00 pesos');
    expect(bucketAccessibilityLabel('year', localDate(2026, 1, 1), 10)).toBe('2026: 10.00 pesos');
  });
});

describe('expenseCountLabel', () => {
  it('counts expenses with grouped thousands', () => {
    expect(expenseCountLabel(0)).toBe('0 gastos');
    expect(expenseCountLabel(1)).toBe('1 gasto');
    expect(expenseCountLabel(3)).toBe('3 gastos');
    expect(expenseCountLabel(1234)).toBe('1,234 gastos');
  });
});
