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
  ignored_reason: null,
  reviewed_at: null,
  amount_dop: 275.72,
  usd_rate: null,
  usd_rate_date: null,
  usd_rate_origin: null,
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
      ignoredReason: null,
      reviewedAt: null,
      dopEquivalent: null,
    });
  });
  it('handles a row without category', () => {
    expect(toListItem({ ...row, category_id: null, categories: null }).categoryName).toBeNull();
  });
});

describe('presentRow', () => {
  it('uses merchant and category', () => {
    expect(presentRow(item())).toEqual({ title: 'UBER*RIDES', subtitle: 'Transporte', badge: undefined, muted: false, amount: 275.72 });
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

describe('presentRow — reversals', () => {
  it('marks a reversal and shows its amount as negative', () => {
    const reversal = presentRow({
      id: 'r', amount: 434.22, currency: 'DOP', merchant: null, occurredAt: '2026-09-17T02:42:00Z', categoryId: null, categoryName: null,
      isIgnored: true, source: 'email', bankCode: 'bhd', type: 'card_reversal', counterpartyLast4: null,
      ignoredReason: 'unmatched_reversal', reviewedAt: null,
    });
    expect(reversal.badge).toBe('Reversa');
    expect(reversal.amount).toBe(-434.22);
    expect(reversal.muted).toBe(true);
  });
});

const usdRow = {
  ...row,
  id: 't2',
  currency: 'USD' as const,
  amount: 15.16,
  merchant: 'NETFLIX.COM',
  amount_dop: 896.26,
  usd_rate: 59.12,
  usd_rate_date: '2026-09-07',
  usd_rate_origin: 'bcrd' as const,
};

describe('DOP equivalent', () => {
  it('maps the DOP equivalent of a USD row', () => {
    expect(toListItem(usdRow).dopEquivalent).toEqual({ amountDop: 896.26, rate: 59.12, rateDate: '2026-09-07', origin: 'bcrd' });
  });
  it('has no equivalent when the database gave no rate', () => {
    expect(toListItem({ ...usdRow, amount_dop: null, usd_rate: null, usd_rate_origin: null }).dopEquivalent).toBeNull();
  });
  it('keeps the fallback origin', () => {
    expect(
      toListItem({ ...usdRow, usd_rate: 60, usd_rate_date: null, usd_rate_origin: 'manual', amount_dop: 909.6 }).dopEquivalent?.origin,
    ).toBe('manual');
  });
  it('has no equivalent for a DOP row even if the view sent numbers', () => {
    expect(toListItem({ ...row, usd_rate: 60, usd_rate_origin: 'manual' }).dopEquivalent).toBeNull();
  });
  it('shows the DOP equivalent of a USD row', () => {
    expect(presentRow(toListItem(usdRow)).approxDop).toBe(896.26);
  });
  it('shows no equivalent for a DOP row', () => {
    expect(presentRow(item()).approxDop).toBeUndefined();
  });
  it('gives a reversal equivalent the same sign as its amount', () => {
    expect(presentRow({ ...toListItem(usdRow), type: 'card_reversal' })).toMatchObject({ amount: -15.16, approxDop: -896.26 });
  });
});
