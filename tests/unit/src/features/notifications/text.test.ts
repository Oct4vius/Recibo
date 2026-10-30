import { describe, expect, it } from 'vitest';
import { budgetAlertContent, isBudgetAlertData } from '@/features/notifications/text';

describe('budgetAlertContent', () => {
  it('80 % weekly', () =>
    expect(budgetAlertContent({ period: 'week', threshold: 80 })).toEqual({
      title: 'Llevas el 80 % de tu presupuesto semanal',
      body: 'Toca para ver tu gasto.',
      data: { kind: 'budget' },
    }));
  it('100 % weekly', () =>
    expect(budgetAlertContent({ period: 'week', threshold: 100 }).title).toBe('Llegaste a tu presupuesto semanal'));
  it('80 % monthly', () =>
    expect(budgetAlertContent({ period: 'month', threshold: 80 }).title).toBe('Llevas el 80 % de tu presupuesto mensual'));
  it('100 % monthly', () =>
    expect(budgetAlertContent({ period: 'month', threshold: 100 }).title).toBe('Llegaste a tu presupuesto mensual'));
  it('never carries an amount', () => {
    for (const period of ['week', 'month'] as const) {
      for (const threshold of [80, 100] as const) {
        const { title, body } = budgetAlertContent({ period, threshold });
        expect(`${title} ${body}`).not.toMatch(/RD\$|US\$|\d+\.\d{2}/);
      }
    }
  });
});

describe('isBudgetAlertData', () => {
  it('accepts our payload', () => expect(isBudgetAlertData({ kind: 'budget' })).toBe(true));
  it('rejects anything else', () => {
    expect(isBudgetAlertData(undefined)).toBe(false);
    expect(isBudgetAlertData(null)).toBe(false);
    expect(isBudgetAlertData({})).toBe(false);
    expect(isBudgetAlertData({ kind: 'other' })).toBe(false);
  });
});
