import { describe, expect, it } from 'vitest';
import { groupByDay } from '@/features/transactions/grouping';

const SD = 'America/Santo_Domingo';
// martes 6 de octubre, 22:30 en Santo Domingo
const now = new Date('2026-10-07T02:30:00Z');
const item = (id: string, occurredAt: string) => ({ id, occurredAt });

describe('groupByDay', () => {
  it('inserts a header before each local day, naming today and yesterday', () => {
    const items = [
      item('a', '2026-10-07T01:00:00Z'), // mar 6, 21:00 → HOY
      item('b', '2026-10-06T04:30:00Z'), // mar 6, 00:30 → HOY
      item('c', '2026-10-06T03:59:00Z'), // lun 5, 23:59 → AYER
      item('d', '2026-10-01T15:00:00Z'), // jue 1, 11:00
    ];
    expect(groupByDay(items, now, SD)).toEqual([
      { kind: 'header', key: 'day-2026-10-06', title: 'HOY' },
      { kind: 'row', key: 'a', item: items[0] },
      { kind: 'row', key: 'b', item: items[1] },
      { kind: 'header', key: 'day-2026-10-05', title: 'AYER' },
      { kind: 'row', key: 'c', item: items[2] },
      { kind: 'header', key: 'day-2026-10-01', title: 'JUE 01 / OCT' },
      { kind: 'row', key: 'd', item: items[3] },
    ]);
  });
  it('returns an empty list for no items', () => {
    expect(groupByDay([], now, SD)).toEqual([]);
  });
});
