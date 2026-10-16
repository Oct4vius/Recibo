import { describe, expect, it } from 'vitest';
import {
  conversionAccessibilityText,
  conversionText,
  type DopEquivalent,
  formatRate,
  latestRateText,
  rateDateLabel,
} from '@/features/rates/text';

const bcrd: DopEquivalent = { amountDop: 896.26, rate: 59.12, rateDate: '2026-09-07', origin: 'bcrd' };
const manual: DopEquivalent = { amountDop: 900, rate: 60, rateDate: null, origin: 'manual' };

describe('rate text', () => {
  it('formatRate keeps 2 to 4 decimals', () => {
    expect(formatRate(59.12)).toBe('59.12');
    expect(formatRate(60)).toBe('60.00');
    expect(formatRate(58.731)).toBe('58.731');
    expect(formatRate(63.0215)).toBe('63.0215');
  });
  it('rateDateLabel is day and lowercase month', () => {
    expect(rateDateLabel('2026-09-07')).toBe('7 sep');
    expect(rateDateLabel('2026-10-15')).toBe('15 oct');
  });
  it('conversionText names the BCRD rate and its date', () => {
    expect(conversionText(bcrd)).toBe('≈ RD$ 896.26 · tasa BCRD del 7 sep: 59.12');
  });
  it('conversionText marks the fallback rate', () => {
    expect(conversionText(manual)).toBe('≈ RD$ 900.00 · tasa de Ajustes: 60.00');
  });
  it('conversionAccessibilityText reads the amount in words', () => {
    expect(conversionAccessibilityText(bcrd)).toBe('aproximadamente 896.26 pesos, tasa BCRD del 7 sep: 59.12');
  });
});

describe('latestRateText', () => {
  it('shows the latest BCRD rate and its date', () => {
    expect(latestRateText({ date: '2026-09-07', sell: 59.12 })).toBe('Última tasa BCRD: 59.12 (7 sep).');
  });
  it('says the fallback is in use when there is no BCRD rate yet', () => {
    expect(latestRateText(null)).toBe('Aún no hay tasas del BCRD: se usa la de respaldo.');
  });
});
