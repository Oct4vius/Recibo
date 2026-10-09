import { describe, expect, it } from 'vitest';
import { toCategory } from '@/features/categories/mapping';

describe('toCategory', () => {
  it('marks own categories and keeps counts_as_spending', () => {
    expect(toCategory({ id: 'c1', name: 'Gym', user_id: 'u1', counts_as_spending: true })).toEqual({
      id: 'c1',
      name: 'Gym',
      isOwn: true,
      countsAsSpending: true,
    });
    expect(toCategory({ id: 'c2', name: 'Transferencias propias', user_id: null, counts_as_spending: false })).toEqual({
      id: 'c2',
      name: 'Transferencias propias',
      isOwn: false,
      countsAsSpending: false,
    });
  });
});
