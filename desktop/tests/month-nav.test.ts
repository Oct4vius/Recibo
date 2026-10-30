import { describe, expect, it } from 'vitest';
import { localDate } from '@/lib/dates';
import { nextMonth, previousMonth } from '@desktop/month/month-nav';

describe('month navigation', () => {
  it('has no next month from the current one', () => {
    expect(nextMonth(localDate(2026, 10, 1), localDate(2026, 10, 1))).toBeNull();
  });
  it('has no next month past the current one', () => {
    expect(nextMonth(localDate(2026, 11, 1), localDate(2026, 10, 1))).toBeNull();
  });
  it('moves forward from a past month', () => {
    expect(nextMonth(localDate(2026, 9, 1), localDate(2026, 10, 1))).toEqual(localDate(2026, 10, 1));
  });
  it('crosses the year going back', () => {
    expect(previousMonth(localDate(2026, 1, 1))).toEqual(localDate(2025, 12, 1));
  });
});
