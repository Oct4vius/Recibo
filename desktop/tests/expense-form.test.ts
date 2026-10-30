import { describe, expect, it } from 'vitest';
import { canSaveExpense, toNewExpense } from '@desktop/expense/expense-form';

const base = { currency: 'DOP' as const, date: '2026-10-20' };
const today = '2026-10-20';

describe('canSaveExpense', () => {
  it.each(['', '0', '0.00', 'abc', '.', '1.234', '12345678', '1,5'])('rejects %j', (amountText) => {
    expect(canSaveExpense({ ...base, amountText }, today)).toBe(false);
  });
  it.each(['150', '150.5', '150.50', '1234567.99'])('accepts %j', (amountText) => {
    expect(canSaveExpense({ ...base, amountText }, today)).toBe(true);
  });
  it('rejects an empty date', () => {
    expect(canSaveExpense({ ...base, amountText: '150', date: '' }, today)).toBe(false);
  });
  it('rejects a future date and accepts it once it is today', () => {
    const form = { amountText: '150', currency: 'DOP' as const, date: '2026-10-21' };
    expect(canSaveExpense(form, '2026-10-20')).toBe(false);
    expect(canSaveExpense(form, '2026-10-21')).toBe(true);
  });
});

describe('toNewExpense', () => {
  it('builds the expense at noon of the chosen local day', () => {
    expect(
      toNewExpense(
        { amountText: '150.50', currency: 'DOP', merchant: '  Colmado  ', categoryId: null, date: '2026-10-20' },
        'America/Santo_Domingo',
      ),
    ).toEqual({
      amountCents: 15050,
      currency: 'DOP',
      merchant: 'Colmado',
      categoryId: null,
      occurredAt: '2026-10-20T16:00:00.000Z',
    });
  });
});
