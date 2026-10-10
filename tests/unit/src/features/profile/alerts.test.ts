import { describe, expect, it } from 'vitest';
import { nextThresholds } from '@/features/profile/alerts';

describe('nextThresholds', () => {
  it('turns one threshold off and keeps the other', () => {
    expect(nextThresholds([80, 100], 80, false)).toEqual([100]);
  });
  it('turns a threshold back on in canonical order', () => {
    expect(nextThresholds([100], 80, true)).toEqual([80, 100]);
  });
  it('computes from what is shown, so two quick taps end with none', () => {
    const afterFirst = nextThresholds([80, 100], 80, false);
    expect(nextThresholds(afterFirst, 100, false)).toEqual([]);
  });
  it('ignores unknown values coming from the server', () => {
    expect(nextThresholds([50, 100], 80, false)).toEqual([100]);
  });
});
