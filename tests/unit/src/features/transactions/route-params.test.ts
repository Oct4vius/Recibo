import { describe, expect, it } from 'vitest';
import { rangeFromParams } from '@/features/transactions/route-params';

const valid = { from: '2026-09-28T04:00:00.000Z', to: '2026-10-05T04:00:00.000Z', label: '28 SEP – 04 OCT' };

describe('rangeFromParams', () => {
  it('builds a range from the navigation params', () => {
    expect(rangeFromParams(valid)).toEqual({ kind: 'range', ...valid });
  });
  it('ignores cleared or missing params (so a second tap on the same row applies again)', () => {
    expect(rangeFromParams({ from: '', to: '', label: '' })).toBeNull();
    expect(rangeFromParams({})).toBeNull();
  });
  it('rejects malformed or inverted ranges', () => {
    expect(rangeFromParams({ ...valid, from: 'ayer' })).toBeNull();
    expect(rangeFromParams({ ...valid, from: valid.to, to: valid.from })).toBeNull();
  });
  it('takes the first value when a param repeats', () => {
    expect(rangeFromParams({ ...valid, label: [valid.label, 'otro'] })?.label).toBe(valid.label);
  });
});
