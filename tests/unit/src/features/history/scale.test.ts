import { describe, expect, it } from 'vitest';
import { barRatios } from '@/features/history/scale';

describe('barRatios', () => {
  it('scales against the largest bar', () => {
    expect(barRatios([50, 100, 25])).toEqual([0.5, 1, 0.25]);
  });
  it('returns all zeros without dividing by zero', () => {
    expect(barRatios([0, 0, 0])).toEqual([0, 0, 0]);
  });
  it('keeps tiny non-zero bars visible', () => {
    expect(barRatios([0.01, 1000])).toEqual([0.02, 1]);
  });
});
