import { describe, expect, it } from 'vitest';
import { localDate } from '@/lib/dates';
import { allTimeTitle, DESKTOP_VIEWS, periodTitle } from '@desktop/history/history-text';

describe('history text', () => {
  it('titles', () => {
    expect(periodTitle('month', localDate(2026, 10, 1))).toBe('Octubre 2026');
    expect(periodTitle('year', localDate(2026, 1, 1))).toBe('2026');
    expect(periodTitle('week', localDate(2026, 10, 5))).toBe('Semana del 5 al 11 de octubre');
    expect(periodTitle('week', localDate(2026, 9, 28))).toBe('Semana del 28 de septiembre al 4 de octubre');
    expect(allTimeTitle('2026-09-14')).toBe('Desde septiembre 2026');
  });
  it('views in the order shown', () => {
    expect(DESKTOP_VIEWS).toEqual(['month', 'week', 'year', 'all']);
  });
});
