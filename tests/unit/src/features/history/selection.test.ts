import { describe, expect, it } from 'vitest';
import { defaultSelectedIso, selectedStartFor, windowKeyOf } from '@/features/history/selection';
import { parseIsoDate } from '@/lib/dates';

describe('history selection', () => {
  it('keeps the selection for the same data', () => {
    const key = windowKeyOf('week', '2026-08-17');
    expect(selectedStartFor({ windowKey: key, startIso: '2026-10-05' }, key)).toBe('2026-10-05');
  });
  it('drops a selection made on other data, even with the same start date', () => {
    const monthKey = windowKeyOf('month', '2026-01-01');
    const yearKey = windowKeyOf('year', '2024-01-01');
    expect(selectedStartFor({ windowKey: monthKey, startIso: '2026-01-01' }, yearKey)).toBeNull();
  });
  it('has no selection by default', () => {
    expect(selectedStartFor(null, windowKeyOf('week', undefined))).toBeNull();
  });
});

describe('defaultSelectedIso', () => {
  const bucket = (startIso: string) => ({ start: parseIsoDate(startIso), startIso, totalDop: 0, txCount: 0 });
  it('picks the current period when the window has it', () => {
    expect(defaultSelectedIso([bucket('2026-09-01'), bucket('2026-10-01')], '2026-10-01')).toBe('2026-10-01');
  });
  it('picks the newest bucket of an older window', () => {
    expect(defaultSelectedIso([bucket('2026-03-01'), bucket('2026-04-01')], '2026-10-01')).toBe('2026-04-01');
  });
  it('has no default without buckets', () => {
    expect(defaultSelectedIso([], '2026-10-01')).toBeNull();
  });
});
