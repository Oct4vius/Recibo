import { describe, expect, it } from 'vitest';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { canSaveExpense, formFromItem, toExpenseChanges, toNewExpense } from '@desktop/expense/expense-form';

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

const tz = 'America/Santo_Domingo';
const now = new Date('2026-10-20T15:00:00.000Z');
const imported: TransactionListItem = {
  id: 't1', amount: 1234.56, currency: 'DOP', merchant: 'UBER*RIDES', occurredAt: '2026-10-18T14:00:00.000Z',
  categoryId: null, categoryName: null, isIgnored: false, source: 'email', bankCode: 'bhd', type: 'card_purchase',
  counterpartyLast4: null, ignoredReason: null, reviewedAt: null, dopEquivalent: null,
};
const manual: TransactionListItem = { ...imported, id: 't2', source: 'manual', bankCode: null, amount: 10 };

describe('formFromItem / toExpenseChanges', () => {
  it('un importado solo cambia la categoría', () => {
    const original = formFromItem(imported, tz);
    expect(toExpenseChanges({ ...original, categoryId: 'c2' }, original, 'email', now, tz)).toEqual({
      amountCents: 123456, merchant: 'UBER*RIDES', categoryId: 'c2',
    });
  });
  it('un manual sin cambiar la fecha no envía occurredAt', () => {
    const original = formFromItem(manual, tz);
    expect(toExpenseChanges({ ...original, amountText: '20.00' }, original, 'manual', now, tz)).not.toHaveProperty('occurredAt');
  });
  it('un manual con otra fecha sí la envía', () => {
    const original = formFromItem(manual, tz);
    expect(toExpenseChanges({ ...original, date: '2026-10-02' }, original, 'manual', now, tz)).toHaveProperty('occurredAt');
  });
  it('la fecha del formulario es la local', () =>
    expect(formFromItem({ ...manual, occurredAt: '2026-10-02T02:00:00.000Z' }, tz).date).toBe('2026-10-01'));
});
