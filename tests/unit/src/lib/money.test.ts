import { describe, expect, it } from 'vitest';
import { currencySymbol, formatMoney, moneyAccessibilityLabel } from '@/lib/money';

describe('formatMoney', () => {
  it('formats DOP with the RD$ prefix, thousands separator and 2 decimals', () => {
    expect(formatMoney(1234.56, 'DOP')).toBe('RD$ 1,234.56');
  });
  it('formats USD with the US$ prefix', () => {
    expect(formatMoney(12, 'USD')).toBe('US$ 12.00');
  });
  it('always shows two decimals', () => {
    expect(formatMoney(275.7, 'DOP')).toBe('RD$ 275.70');
    expect(formatMoney(0, 'DOP')).toBe('RD$ 0.00');
  });
  it('rounds to two decimals', () => {
    expect(formatMoney(10.126, 'DOP')).toBe('RD$ 10.13');
  });
  it('puts the minus sign before the currency', () => {
    expect(formatMoney(-50, 'DOP')).toBe('-RD$ 50.00');
  });
  it('handles millions', () => {
    expect(formatMoney(1234567.8, 'USD')).toBe('US$ 1,234,567.80');
  });
});

describe('moneyAccessibilityLabel', () => {
  it('reads pesos and dólares instead of symbols', () => {
    expect(moneyAccessibilityLabel(1234.56, 'DOP')).toBe('1,234.56 pesos');
    expect(moneyAccessibilityLabel(12, 'USD')).toBe('12.00 dólares');
  });
  it('reads negatives with "menos"', () => {
    expect(moneyAccessibilityLabel(-50, 'DOP')).toBe('menos 50.00 pesos');
  });
});

describe('currencySymbol', () => {
  it('returns the display prefix of each currency', () => {
    expect(currencySymbol('DOP')).toBe('RD$');
    expect(currencySymbol('USD')).toBe('US$');
  });
});
