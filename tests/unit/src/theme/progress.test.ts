import { describe, expect, it } from 'vitest';
import { progressState } from '@/theme/progress';

describe('progressState', () => {
  it('is normal below 80%', () => {
    expect(progressState(3000, 6000)).toEqual({ fill: 0.5, percent: 50, tone: 'normal' });
  });
  it('floors the percent so 79.98% is not shown as 80%', () => {
    expect(progressState(4799, 6000)).toEqual({ fill: 4799 / 6000, percent: 79, tone: 'normal' });
  });
  it('warns from exactly 80%', () => {
    expect(progressState(4800, 6000).tone).toBe('warning');
  });
  it('is over from exactly 100% and clamps the fill to 1', () => {
    expect(progressState(6000, 6000)).toEqual({ fill: 1, percent: 100, tone: 'over' });
    expect(progressState(9000, 6000)).toEqual({ fill: 1, percent: 150, tone: 'over' });
  });
  it('treats negative spending as zero', () => {
    expect(progressState(-10, 6000)).toEqual({ fill: 0, percent: 0, tone: 'normal' });
  });
  it('rejects a non-positive limit', () => {
    expect(() => progressState(10, 0)).toThrow('limit must be greater than 0');
  });
});
