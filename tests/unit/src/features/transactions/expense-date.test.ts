import { describe, expect, it } from 'vitest';
import { occurredAtFor } from '@/features/transactions/expense-date';
import { localDate } from '@/lib/dates';

const SD = 'America/Santo_Domingo';
// martes 6 de octubre, 22:30 en Santo Domingo (ya es 7 en UTC)
const now = new Date('2026-10-07T02:30:00Z');

describe('occurredAtFor', () => {
  it('uses the current instant for "today"', () => {
    expect(occurredAtFor({ kind: 'today' }, now, SD)).toBe('2026-10-07T02:30:00.000Z');
  });
  it('uses yesterday in the profile zone at the current local time', () => {
    expect(occurredAtFor({ kind: 'yesterday' }, now, SD)).toBe('2026-10-06T02:30:00.000Z');
  });
  it('uses the chosen local date at the current local time', () => {
    expect(occurredAtFor({ kind: 'other', date: localDate(2026, 10, 1) }, now, SD)).toBe('2026-10-02T02:30:00.000Z');
  });
});
