import { describe, expect, it } from 'vitest';
import { balanceText, daysLeft, spentOfLimitText } from '@/features/budgets/text';
import { parseIsoDate } from '@/lib/dates';

describe('daysLeft', () => {
  it('counts today: Monday → 7, Sunday → 1', () => {
    expect(daysLeft('2026-10-12', parseIsoDate('2026-10-05'))).toBe(7);
    expect(daysLeft('2026-10-12', parseIsoDate('2026-10-11'))).toBe(1);
  });
  it('works at the end of the month', () => {
    expect(daysLeft('2026-11-01', parseIsoDate('2026-10-31'))).toBe(1);
  });
});

describe('balanceText', () => {
  it('says what is left and the days', () => {
    expect(balanceText({ kind: 'left', cents: 202428 }, 3)).toBe('Quedan RD$ 2,024.28 · 3 días');
    expect(balanceText({ kind: 'left', cents: 0 }, 1)).toBe('Quedan RD$ 0.00 · 1 día');
  });
  it('says how much over without celebrating', () => {
    expect(balanceText({ kind: 'over', cents: 31200 }, 3)).toBe('Te pasaste por RD$ 312.00 · 3 días');
  });
});

describe('spentOfLimitText', () => {
  it('formats spent of limit in pesos', () => {
    expect(spentOfLimitText(4275.72, 6300)).toBe('RD$ 4,275.72 de RD$ 6,300.00');
  });
});
