import { describe, expect, it } from 'vitest';
import { toRule } from '@/features/rules/mapping';

describe('toRule', () => {
  it('maps the row with the embedded category name', () => {
    expect(
      toRule({ id: 'r1', pattern: '0099', match_field: 'counterparty_last4', category_id: 'c1', categories: { name: 'Transferencias propias' } }),
    ).toEqual({ id: 'r1', pattern: '0099', matchField: 'counterparty_last4', categoryId: 'c1', categoryName: 'Transferencias propias' });
  });
  it('treats any other match_field as merchant', () => {
    expect(toRule({ id: 'r2', pattern: 'UBER', match_field: 'merchant', category_id: 'c2', categories: null }).matchField).toBe('merchant');
  });
});
