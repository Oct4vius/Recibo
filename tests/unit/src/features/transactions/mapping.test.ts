import { describe, expect, it } from 'vitest';
import { presentRow, toListItem, type TransactionListItem } from '@/features/transactions/mapping';

const row = {
  id: 't1',
  amount: 275.72,
  currency: 'DOP' as const,
  merchant: 'UBER*RIDES',
  occurred_at: '2026-10-06T02:42:00+00:00',
  category_id: 'c1',
  is_ignored: false,
  source: 'email' as const,
  bank_code: 'bhd' as const,
  type: 'transfer_out' as const,
  counterparty_last4: '0099',
  categories: { name: 'Transporte' },
};

const item = (overrides: Partial<TransactionListItem> = {}): TransactionListItem => ({ ...toListItem(row), ...overrides });

describe('toListItem', () => {
  it('maps the database row to the list item', () => {
    expect(toListItem(row)).toEqual({
      id: 't1',
      amount: 275.72,
      currency: 'DOP',
      merchant: 'UBER*RIDES',
      occurredAt: '2026-10-06T02:42:00+00:00',
      categoryId: 'c1',
      categoryName: 'Transporte',
      isIgnored: false,
      source: 'email',
      bankCode: 'bhd',
      type: 'transfer_out',
      counterpartyLast4: '0099',
    });
  });
  it('handles a row without category', () => {
    expect(toListItem({ ...row, category_id: null, categories: null }).categoryName).toBeNull();
  });
});

describe('presentRow', () => {
  it('uses merchant and category', () => {
    expect(presentRow(item())).toEqual({ title: 'UBER*RIDES', subtitle: 'Transporte', badge: undefined, muted: false });
  });
  it('falls back when merchant or category are missing', () => {
    expect(presentRow(item({ merchant: '  ', categoryName: null }))).toMatchObject({
      title: 'Sin descripción',
      subtitle: 'Sin categoría',
    });
  });
  it('marks manual expenses', () => {
    expect(presentRow(item({ source: 'manual' })).badge).toBe('Manual');
  });
  it('mutes ignored transactions and says so (takes precedence over Manual)', () => {
    expect(presentRow(item({ source: 'manual', isIgnored: true }))).toMatchObject({ badge: 'Ignorado', muted: true });
  });
});
