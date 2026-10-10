import { describe, expect, it } from 'vitest';
import { budgetBalance, progressState } from '@/theme/progress';

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

describe('regression — progressState percent floating point', () => {
  it('does not lose a point to float error in ratio * 100', () => {
    expect(progressState(29, 100).percent).toBe(29);
    expect(progressState(57, 100).percent).toBe(57);
    expect(progressState(58, 100).percent).toBe(58);
    expect(progressState(9.1, 10).percent).toBe(91);
  });
});

describe('budgetBalance', () => {
  it('says what is left, in whole cents', () => {
    expect(budgetBalance(4275.72, 6300)).toEqual({ kind: 'left', cents: 202428 });
  });
  it('leaves zero exactly at the limit', () => {
    expect(budgetBalance(6300, 6300)).toEqual({ kind: 'left', cents: 0 });
  });
  it('reports one cent over', () => {
    expect(budgetBalance(6300.01, 6300)).toEqual({ kind: 'over', cents: 1 });
  });
  it('treats no spending as the whole limit left', () => {
    expect(budgetBalance(0, 6300)).toEqual({ kind: 'left', cents: 630000 });
  });
});
