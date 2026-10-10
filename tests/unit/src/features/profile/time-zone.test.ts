import { describe, expect, it } from 'vitest';
import { formatUtcOffset, timeZoneCity, timeZoneLabel } from '@/features/profile/time-zone';

describe('timeZoneCity', () => {
  it('uses the last segment with spaces', () => {
    expect(timeZoneCity('America/Santo_Domingo')).toBe('Santo Domingo');
    expect(timeZoneCity('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(timeZoneCity('UTC')).toBe('UTC');
  });
});

describe('formatUtcOffset', () => {
  it('formats whole hours, half hours and zero', () => {
    expect(formatUtcOffset(-240)).toBe('UTC−4');
    expect(formatUtcOffset(330)).toBe('UTC+5:30');
    expect(formatUtcOffset(0)).toBe('UTC+0');
  });
});

describe('timeZoneLabel', () => {
  it('combines city and current offset', () => {
    expect(timeZoneLabel('America/Santo_Domingo', new Date('2026-10-09T15:00:00Z'))).toBe('Santo Domingo (UTC−4)');
  });
});
