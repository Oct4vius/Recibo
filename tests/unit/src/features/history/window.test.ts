import { describe, expect, it } from 'vitest';
import { bucketRange, historyWindow } from '@/features/history/window';
import { localDate } from '@/lib/dates';

const today = localDate(2026, 10, 9); // viernes

describe('historyWindow', () => {
  it('covers 8 weeks ending in the current one', () => {
    expect(historyWindow('week', 0, today)).toEqual({ first: localDate(2026, 8, 17), last: localDate(2026, 10, 5), size: 8 });
  });
  it('moves one block back with offset 1', () => {
    expect(historyWindow('week', 1, today)).toEqual({ first: localDate(2026, 6, 22), last: localDate(2026, 8, 10), size: 8 });
  });
  it('covers 6 months across a year boundary', () => {
    expect(historyWindow('month', 0, localDate(2026, 2, 14))).toEqual({
      first: localDate(2025, 9, 1),
      last: localDate(2026, 2, 1),
      size: 6,
    });
  });
  it('covers 3 years', () => {
    expect(historyWindow('year', 0, today)).toEqual({ first: localDate(2024, 1, 1), last: localDate(2026, 1, 1), size: 3 });
  });
});

describe('bucketRange', () => {
  const SD = 'America/Santo_Domingo';
  it('turns a week into instants in the profile zone, across the year', () => {
    expect(bucketRange('week', localDate(2026, 12, 28), SD)).toEqual({
      from: '2026-12-28T04:00:00.000Z',
      to: '2027-01-04T04:00:00.000Z',
    });
  });
  it('turns a month and a year into instants', () => {
    expect(bucketRange('month', localDate(2026, 10, 1), SD)).toEqual({
      from: '2026-10-01T04:00:00.000Z',
      to: '2026-11-01T04:00:00.000Z',
    });
    expect(bucketRange('year', localDate(2026, 1, 1), SD)).toEqual({
      from: '2026-01-01T04:00:00.000Z',
      to: '2027-01-01T04:00:00.000Z',
    });
  });
});
