import { describe, expect, it } from 'vitest';
import { pickRecentCategories } from '@/features/categories/recent';

const all = [
  { id: 'a', name: 'Comida' },
  { id: 'b', name: 'Hogar' },
  { id: 'c', name: 'Salud' },
  { id: 'd', name: 'Transporte' },
];

describe('pickRecentCategories', () => {
  it('keeps the order of most recent use without repeats', () => {
    expect(pickRecentCategories(['d', 'd', 'a', 'c', 'b'], all)).toEqual([all[3], all[0], all[2]]);
  });
  it('skips nulls and unknown ids, then fills with the first by name', () => {
    expect(pickRecentCategories([null, 'zzz', 'c'], all)).toEqual([all[2], all[0], all[1]]);
  });
  it('returns the first by name when there is no history', () => {
    expect(pickRecentCategories([], all, 2)).toEqual([all[0], all[1]]);
  });
});
