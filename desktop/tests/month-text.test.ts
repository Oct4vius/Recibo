import { describe, expect, it } from 'vitest';
import { localDate } from '@/lib/dates';
import { budgetLine, expenseCountLine, monthTitle } from '@desktop/month/month-text';

describe('monthTitle', () => {
  it('capitalizes the month and adds the year', () => {
    expect(monthTitle(localDate(2026, 10, 1))).toBe('Octubre 2026');
  });
});

describe('expenseCountLine', () => {
  it('uses the current-month wording', () => {
    expect(expenseCountLine(23, true, localDate(2026, 10, 1))).toBe('Llevas 23 gastos este mes');
    expect(expenseCountLine(1, true, localDate(2026, 10, 1))).toBe('Llevas 1 gasto este mes');
  });
  it('names the month for past months', () => {
    expect(expenseCountLine(31, false, localDate(2026, 9, 1))).toBe('31 gastos en septiembre');
    expect(expenseCountLine(1, false, localDate(2026, 9, 1))).toBe('1 gasto en septiembre');
  });
});

describe('budgetLine', () => {
  it('shows percent and what is left', () => {
    expect(budgetLine(38420, 50000)).toMatchObject({
      text: '76 % de tu presupuesto · Te quedan RD$ 11,580.00',
      over: false,
    });
    expect(budgetLine(38420, 50000).fill).toBeCloseTo(0.7684);
  });
  it('shows 0 % with nothing spent', () => {
    expect(budgetLine(0, 50000).text).toBe('0 % de tu presupuesto · Te quedan RD$ 50,000.00');
  });
  it('reports the excess when over', () => {
    expect(budgetLine(52000, 50000)).toEqual({ text: 'Te pasaste por RD$ 2,000.00', fill: 1, over: true });
  });
  it('is over exactly at the limit', () => {
    expect(budgetLine(50000, 50000)).toEqual({ text: 'Llegaste a tu presupuesto', fill: 1, over: true });
  });
  it('handles a missing or non-positive limit', () => {
    const none = { text: 'Aún no tienes presupuesto', fill: 0, over: false };
    expect(budgetLine(1000, null)).toEqual(none);
    expect(budgetLine(1000, 0)).toEqual(none);
  });
});
