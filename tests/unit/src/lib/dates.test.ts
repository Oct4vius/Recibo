import { describe, expect, it } from 'vitest';
import { formatDayLabel, toLocalDate, weekStart, type LocalDate } from '@/lib/dates';

const SD = 'America/Santo_Domingo';
const d = (year: number, month: number, day: number, weekday: number): LocalDate => ({ year, month, day, weekday });

describe('toLocalDate', () => {
  it('converts an instant to the calendar date in the given time zone', () => {
    // 2026-10-06T02:30Z = lunes 5 de octubre, 22:30 en Santo Domingo (UTC-4)
    expect(toLocalDate(new Date('2026-10-06T02:30:00Z'), SD)).toEqual(d(2026, 10, 5, 1));
  });
  it('keeps the same date when UTC and local agree', () => {
    expect(toLocalDate(new Date('2026-10-06T15:00:00Z'), SD)).toEqual(d(2026, 10, 6, 2));
  });
  it('reports Sunday as weekday 7', () => {
    expect(toLocalDate(new Date('2026-10-11T12:00:00Z'), SD).weekday).toBe(7);
  });
});

describe('weekStart', () => {
  it('keeps a Monday as is', () => {
    expect(weekStart(d(2026, 10, 5, 1))).toEqual(d(2026, 10, 5, 1));
  });
  it('moves a Sunday back to the previous Monday', () => {
    expect(weekStart(d(2026, 10, 11, 7))).toEqual(d(2026, 10, 5, 1));
  });
  it('crosses a month boundary', () => {
    // jueves 1 de octubre de 2026 → lunes 28 de septiembre
    expect(weekStart(d(2026, 10, 1, 4))).toEqual(d(2026, 9, 28, 1));
  });
  it('crosses a year boundary', () => {
    // viernes 1 de enero de 2027 → lunes 28 de diciembre de 2026
    expect(weekStart(d(2027, 1, 1, 5))).toEqual(d(2026, 12, 28, 1));
  });
});

describe('formatDayLabel', () => {
  it('uses Spanish abbreviations and two-digit days', () => {
    expect(formatDayLabel(d(2026, 10, 6, 2))).toBe('MAR 06 / OCT');
    expect(formatDayLabel(d(2026, 1, 11, 7))).toBe('DOM 11 / ENE');
  });
});
