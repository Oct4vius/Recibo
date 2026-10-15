import { describe, expect, it } from 'vitest';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { canToggleIgnored, needsReview } from '@/features/transactions/review';

const reversal: TransactionListItem = {
  id: 'r', amount: 434.22, currency: 'DOP', merchant: null, occurredAt: '2026-09-17T02:42:00Z', categoryId: null, categoryName: null,
  isIgnored: true, source: 'email', bankCode: 'bhd', type: 'card_reversal', counterpartyLast4: null,
  ignoredReason: 'unmatched_reversal', reviewedAt: null,
};

describe('review actions', () => {
  it('an unmatched, unreviewed reversal needs review', () => {
    expect(needsReview(reversal)).toBe(true);
    expect(needsReview({ ...reversal, reviewedAt: '2026-10-10T12:00:00Z' })).toBe(false);
    expect(needsReview({ ...reversal, ignoredReason: 'reversed' })).toBe(false);
  });
  it('reversals never toggle between counted and ignored; purchases do', () => {
    expect(canToggleIgnored(reversal)).toBe(false);
    expect(canToggleIgnored({ ...reversal, type: 'card_purchase', isIgnored: false, ignoredReason: null })).toBe(true);
  });
});
