import { describe, expect, it } from 'vitest';
import {
  centsToText,
  formatAmountInput,
  pressKey,
  textToCents,
  type AmountKey,
} from '@/features/transactions/amount-input';

const press = (start: string, ...keys: AmountKey[]) => keys.reduce(pressKey, start);

describe('pressKey', () => {
  it('appends digits', () => {
    expect(press('', '2', '7', '5')).toBe('275');
  });
  it('replaces a single leading zero and never repeats zeros', () => {
    expect(press('0', '5')).toBe('5');
    expect(press('', '0', '0')).toBe('0');
  });
  it('starts decimals with "0." when the dot comes first', () => {
    expect(press('', '.')).toBe('0.');
  });
  it('accepts the dot only once', () => {
    expect(press('12.', '.')).toBe('12.');
  });
  it('allows at most two decimals', () => {
    expect(press('1.25', '9')).toBe('1.25');
  });
  it('caps the integer part at 7 digits but still allows decimals', () => {
    expect(press('9999999', '9')).toBe('9999999');
    expect(press('9999999', '.', '9', '9')).toBe('9999999.99');
  });
  it('deletes the last character', () => {
    expect(press('275.7', 'backspace')).toBe('275.');
    expect(press('', 'backspace')).toBe('');
  });
});

describe('textToCents / centsToText', () => {
  it('converts typed text to integer cents', () => {
    expect(textToCents('')).toBe(0);
    expect(textToCents('275')).toBe(27500);
    expect(textToCents('275.7')).toBe(27570);
    expect(textToCents('0.05')).toBe(5);
    expect(textToCents('0.')).toBe(0);
    expect(textToCents('9999999.99')).toBe(999999999);
  });
  it('converts cents back to editable text with two decimals', () => {
    expect(centsToText(27570)).toBe('275.70');
    expect(centsToText(5)).toBe('0.05');
    expect(centsToText(100)).toBe('1.00');
  });
});

describe('formatAmountInput', () => {
  it('shows the currency, groups thousands and keeps what was typed after the dot', () => {
    expect(formatAmountInput('', 'DOP')).toBe('RD$ 0');
    expect(formatAmountInput('1234.5', 'DOP')).toBe('RD$ 1,234.5');
    expect(formatAmountInput('1234567', 'USD')).toBe('US$ 1,234,567');
    expect(formatAmountInput('0.', 'DOP')).toBe('RD$ 0.');
  });
});
