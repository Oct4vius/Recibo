import { describe, expect, it } from 'vitest';
import { comparisonText } from '@/features/summary/comparison';

describe('comparisonText', () => {
  it('says how much more than the previous week', () => {
    expect(comparisonText(4275.72, 3663.42, 'week')).toBe('RD$ 612.30 más que la semana pasada');
  });
  it('says how much less than the previous month', () => {
    expect(comparisonText(100, 240, 'month')).toBe('RD$ 140.00 menos que el mes pasado');
  });
  it('says equal when there is no difference, ignoring float noise', () => {
    expect(comparisonText(50.1, 50.1, 'week')).toBe('Igual que la semana pasada');
    expect(comparisonText(0.3, 0.1 + 0.2, 'month')).toBe('Igual que el mes pasado');
  });
});
