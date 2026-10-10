import { describe, expect, it } from 'vitest';
import { usdRateText } from '@/features/profile/rate';

describe('usdRateText', () => {
  it('reads as pesos per dollar', () => {
    expect(usdRateText(60)).toBe('RD$ 60.00 por US$ 1');
    expect(usdRateText(61.5)).toBe('RD$ 61.50 por US$ 1');
  });
});
