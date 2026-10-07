import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, periodRange } from '@/features/transactions/filters';

const SD = 'America/Santo_Domingo';

describe('periodRange', () => {
  // martes 6 de octubre de 2026, 11:00 en Santo Domingo
  const now = new Date('2026-10-06T15:00:00Z');

  it('covers Monday 00:00 to next Monday 00:00 in the profile zone for "week"', () => {
    expect(periodRange('week', now, SD)).toEqual({ from: '2026-10-05T04:00:00.000Z', to: '2026-10-12T04:00:00.000Z' });
  });
  it('covers the first day of the month to the first of the next for "month"', () => {
    expect(periodRange('month', now, SD)).toEqual({ from: '2026-10-01T04:00:00.000Z', to: '2026-11-01T04:00:00.000Z' });
  });
  it('crosses the year boundary', () => {
    // 31 de diciembre, 19:00 en Santo Domingo
    expect(periodRange('month', new Date('2026-12-31T23:00:00Z'), SD)).toEqual({
      from: '2026-12-01T04:00:00.000Z',
      to: '2027-01-01T04:00:00.000Z',
    });
  });
  it('has no bounds for "all"', () => {
    expect(periodRange('all', now, SD)).toEqual({ from: null, to: null });
  });
  it('defaults to this month with no other filter', () => {
    expect(DEFAULT_FILTERS).toEqual({ period: 'month', categoryId: null, currency: null, bankCode: null, review: false });
  });
});
