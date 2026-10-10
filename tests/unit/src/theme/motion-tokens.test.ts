import { describe, expect, it } from 'vitest';
import { STAGGER_MAX_ROWS, durations, springs, staggerDelay } from '@/theme/motion-tokens';

describe('motion tokens', () => {
  it('matches the spec values', () => {
    expect(springs.snap).toEqual({ damping: 18, stiffness: 380, mass: 0.6 });
    expect(springs.slam).toEqual({ damping: 14, stiffness: 260, mass: 1 });
    expect(durations).toEqual({ tap: 90, screen: 220, reducedFade: 120, staggerStep: 35 });
  });
  it('staggers rows by 35 ms and stops growing after 8 rows', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(105);
    expect(staggerDelay(STAGGER_MAX_ROWS - 1)).toBe(245);
    expect(staggerDelay(40)).toBe(245);
  });
});
