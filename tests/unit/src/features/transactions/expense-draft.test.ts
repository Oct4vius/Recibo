import { describe, expect, it } from 'vitest';
import {
  canSave,
  dateChoiceOf,
  draftFromItem,
  draftToChanges,
  draftToNewExpense,
  emptyDraft,
} from '@/features/transactions/expense-draft';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { localDate } from '@/lib/dates';

const SD = 'America/Santo_Domingo';
// martes 6 de octubre, 22:30 en Santo Domingo (ya es 7 en UTC)
const now = new Date('2026-10-07T02:30:00Z');

const item: TransactionListItem = {
  id: 't1',
  amount: 275.7,
  currency: 'USD',
  merchant: null,
  occurredAt: '2026-10-06T03:00:00Z', // lun 5, 23:00 → AYER
  categoryId: 'c1',
  categoryName: 'Comida',
  isIgnored: false,
  source: 'manual',
  bankCode: null,
  type: 'card_purchase',
  counterpartyLast4: null,
};

describe('emptyDraft', () => {
  it('starts empty, today, in the given currency', () => {
    expect(emptyDraft('DOP')).toEqual({ amountText: '', currency: 'DOP', merchant: '', categoryId: null, date: { kind: 'today' } });
  });
});

describe('dateChoiceOf', () => {
  it('names today and yesterday in the profile zone, otherwise keeps the local date', () => {
    expect(dateChoiceOf('2026-10-07T01:00:00Z', now, SD)).toEqual({ kind: 'today' });
    expect(dateChoiceOf('2026-10-06T03:00:00Z', now, SD)).toEqual({ kind: 'yesterday' });
    expect(dateChoiceOf('2026-10-01T15:00:00Z', now, SD)).toEqual({ kind: 'other', date: localDate(2026, 10, 1) });
  });
});

describe('draftFromItem', () => {
  it('preloads the expense with its amount as editable text', () => {
    expect(draftFromItem(item, now, SD)).toEqual({
      amountText: '275.70',
      currency: 'USD',
      merchant: '',
      categoryId: 'c1',
      date: { kind: 'yesterday' },
    });
  });
});

describe('canSave', () => {
  it('requires an amount greater than zero', () => {
    expect(canSave(emptyDraft('DOP'))).toBe(false);
    expect(canSave({ ...emptyDraft('DOP'), amountText: '0.' })).toBe(false);
    expect(canSave({ ...emptyDraft('DOP'), amountText: '0.05' })).toBe(true);
  });
});

describe('draftToNewExpense', () => {
  it('converts the draft to cents and the chosen day to an instant', () => {
    const draft = { ...emptyDraft('DOP'), amountText: '1234.5', merchant: 'Colmado', date: { kind: 'yesterday' as const } };
    expect(draftToNewExpense(draft, now, SD)).toEqual({
      amountCents: 123450,
      currency: 'DOP',
      merchant: 'Colmado',
      categoryId: null,
      occurredAt: '2026-10-06T02:30:00.000Z',
    });
  });
});

describe('draftToChanges', () => {
  const original = draftFromItem(item, now, SD);

  it('never sends currency or date for an imported transaction', () => {
    const draft = { ...original, amountText: '300', currency: 'DOP' as const, date: { kind: 'today' as const } };
    expect(draftToChanges(draft, original, 'email', now, SD)).toEqual({ amountCents: 30000, merchant: '', categoryId: 'c1' });
  });
  it('keeps the original time of a manual expense when the day did not change', () => {
    expect(draftToChanges(original, original, 'manual', now, SD)).toEqual({
      amountCents: 27570,
      merchant: '',
      categoryId: 'c1',
      currency: 'USD',
    });
  });
  it('sends the new instant when the day of a manual expense changed', () => {
    const draft = { ...original, date: { kind: 'today' as const } };
    expect(draftToChanges(draft, original, 'manual', now, SD)).toMatchObject({ occurredAt: '2026-10-07T02:30:00.000Z' });
  });
});
