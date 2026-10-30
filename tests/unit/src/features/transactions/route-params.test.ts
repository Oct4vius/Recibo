import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, UNCATEGORIZED } from '@/features/transactions/filters';
import { CLEARED_RANGE_PARAMS, filtersFromParams, rangeFromParams } from '@/features/transactions/route-params';

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

describe('filtersFromParams', () => {
  const uuid = '3f2c8a1e-5b7d-4c9e-8f10-2a3b4c5d6e7f';
  const range = { kind: 'range', ...valid } as const;

  it('builds filters from a range, with or without a category', () => {
    expect(filtersFromParams(valid)).toEqual({ ...DEFAULT_FILTERS, period: range });
    expect(filtersFromParams({ ...valid, categoryId: uuid })).toEqual({ ...DEFAULT_FILTERS, period: range, categoryId: uuid });
  });
  it('supports the all-time period and the uncategorized filter', () => {
    expect(filtersFromParams({ period: 'all', categoryId: 'none' })).toEqual({
      ...DEFAULT_FILTERS,
      period: 'all',
      categoryId: UNCATEGORIZED,
    });
    expect(filtersFromParams({ period: 'all' })).toEqual({ ...DEFAULT_FILTERS, period: 'all' });
  });
  it('lets a valid range win over period=all', () => {
    expect(filtersFromParams({ ...valid, period: 'all' })).toEqual({ ...DEFAULT_FILTERS, period: range });
  });
  it('applies nothing once the params are cleared or without a period', () => {
    expect(filtersFromParams(CLEARED_RANGE_PARAMS)).toBeNull();
    expect(filtersFromParams({ categoryId: uuid })).toBeNull();
  });
  describe('regression #category-param — a garbage category id is dropped instead of reaching Postgres (22P02)', () => {
    it('drops ids that are neither "none" nor a uuid', () => {
      expect(filtersFromParams({ period: 'all', categoryId: "x' or 1=1" })).toEqual({ ...DEFAULT_FILTERS, period: 'all' });
    });
  });
});
