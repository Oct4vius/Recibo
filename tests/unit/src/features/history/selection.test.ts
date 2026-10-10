import { describe, expect, it } from 'vitest';
import { selectedStartFor, windowKeyOf } from '@/features/history/selection';

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
