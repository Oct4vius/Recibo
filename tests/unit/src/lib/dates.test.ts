import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_ZONE,
  addDays,
  addMonths,
  daysBetween,
  formatDayLabel,
  isSameDate,
  localDate,
  minutesOfDay,
  monthAbbreviation,
  monthName,
  monthStart,
  nextMonthStart,
  parseIsoDate,
  toIsoDate,
  toLocalDate,
  utcOffsetMinutes,
  weekStart,
  weekdayOf,
  yearStart,
  zonedInstant,
  type LocalDate,
} from '@/lib/dates';

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

describe('weekdayOf / localDate', () => {
  it('derives the weekday from the calendar date', () => {
    expect(weekdayOf(2026, 10, 5)).toBe(1);
    expect(weekdayOf(2026, 10, 11)).toBe(7);
    expect(localDate(2026, 10, 6)).toEqual(d(2026, 10, 6, 2));
  });
  it('normalizes overflowing days and months', () => {
    expect(localDate(2026, 13, 1)).toEqual(d(2027, 1, 1, 5));
    expect(localDate(2026, 10, 0)).toEqual(d(2026, 9, 30, 3));
  });
});

describe('time zone handling', () => {
  it('falls back to the default zone when the zone is invalid', () => {
    const instant = new Date('2026-10-06T02:30:00Z');
    expect(toLocalDate(instant, 'Mars/Olympus')).toEqual(toLocalDate(instant, DEFAULT_TIME_ZONE));
  });
  it('reads the local minutes of the day', () => {
    expect(minutesOfDay(new Date('2026-10-06T02:30:00Z'), SD)).toBe(22 * 60 + 30);
  });
  it('builds the instant of a local date and time', () => {
    expect(zonedInstant(localDate(2026, 10, 6), 22 * 60 + 30, SD).toISOString()).toBe('2026-10-07T02:30:00.000Z');
    expect(zonedInstant(localDate(2026, 10, 5), 0, SD).toISOString()).toBe('2026-10-05T04:00:00.000Z');
  });
});

describe('calendar arithmetic', () => {
  it('adds days across months', () => {
    expect(addDays(localDate(2026, 10, 1), -1)).toEqual(d(2026, 9, 30, 3));
    expect(addDays(localDate(2026, 12, 28), 7)).toEqual(d(2027, 1, 4, 1));
  });
  it('finds month boundaries', () => {
    expect(monthStart(localDate(2026, 10, 17))).toEqual(d(2026, 10, 1, 4));
    expect(nextMonthStart(localDate(2026, 12, 15))).toEqual(d(2027, 1, 1, 5));
  });
  it('compares and serializes dates', () => {
    expect(isSameDate(localDate(2026, 10, 6), d(2026, 10, 6, 2))).toBe(true);
    expect(isSameDate(localDate(2026, 10, 6), localDate(2026, 10, 7))).toBe(false);
    expect(toIsoDate(localDate(2026, 1, 5))).toBe('2026-01-05');
  });
});

describe('parseIsoDate / daysBetween', () => {
  it('parses a Postgres date', () => {
    expect(parseIsoDate('2026-10-05')).toEqual({ year: 2026, month: 10, day: 5, weekday: 1 });
  });
  it('counts days between calendar dates, across months and years', () => {
    expect(daysBetween(parseIsoDate('2026-10-09'), parseIsoDate('2026-10-12'))).toBe(3);
    expect(daysBetween(parseIsoDate('2026-12-31'), parseIsoDate('2027-01-01'))).toBe(1);
    expect(daysBetween(parseIsoDate('2026-10-12'), parseIsoDate('2026-10-09'))).toBe(-3);
  });
});

describe('addMonths / yearStart', () => {
  it('moves to the first day of another month, across years', () => {
    expect(addMonths(localDate(2026, 10, 1), -10)).toEqual(localDate(2025, 12, 1));
    expect(addMonths(localDate(2026, 12, 1), 1)).toEqual(localDate(2027, 1, 1));
  });
  it('returns January 1st', () => {
    expect(yearStart(localDate(2026, 10, 9))).toEqual(localDate(2026, 1, 1));
  });
});

describe('utcOffsetMinutes', () => {
  const now = new Date('2026-10-09T15:00:30Z');
  it('is -240 in Santo Domingo, +330 in Kolkata and 0 in UTC', () => {
    expect(utcOffsetMinutes(now, 'America/Santo_Domingo')).toBe(-240);
    expect(utcOffsetMinutes(now, 'Asia/Kolkata')).toBe(330);
    expect(utcOffsetMinutes(now, 'UTC')).toBe(0);
  });
});

describe('month names', () => {
  it('abbreviates and names months in Spanish', () => {
    expect(monthAbbreviation(10)).toBe('OCT');
    expect(monthName(10)).toBe('octubre');
  });
});
