import { describe, expect, it } from 'vitest';
import { isAmountText, sanitizeAmountText } from '@desktop/ui/amount-text';

describe('sanitizeAmountText', () => {
  it('keeps digits and a single dot', () => {
    expect(sanitizeAmountText('1a2,3.4.5')).toBe('123.45');
  });
});

describe('isAmountText', () => {
  it('accepts and rejects', () => {
    expect(['1', '1.5', '1234567.89'].every(isAmountText)).toBe(true);
    expect(['', '0', '0.00', '12345678', '1.234', 'abc'].some(isAmountText)).toBe(false);
  });
});
