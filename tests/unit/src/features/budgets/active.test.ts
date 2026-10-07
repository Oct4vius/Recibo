import { describe, expect, it } from 'vitest';
import { toActiveBudgets } from '@/features/budgets/active';

describe('toActiveBudgets', () => {
  it('maps the active week and month limits', () => {
    expect(
      toActiveBudgets([
        { period: 'week', limit_amount: 6000 },
        { period: 'month', limit_amount: 25000 },
      ]),
    ).toEqual({ week: 6000, month: 25000 });
  });
  it('returns null for a period without an active budget', () => {
    expect(toActiveBudgets([{ period: 'month', limit_amount: 25000 }])).toEqual({ week: null, month: 25000 });
  });
});
