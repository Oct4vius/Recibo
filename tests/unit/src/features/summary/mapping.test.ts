import { describe, expect, it } from 'vitest';
import { toSpendingSummary } from '@/features/summary/mapping';

describe('toSpendingSummary', () => {
  it('maps the RPC row', () => {
    expect(toSpendingSummary({ total_dop: 1045.72, previous_total_dop: 100, tx_count: 3 })).toEqual({
      totalDop: 1045.72,
      previousTotalDop: 100,
      txCount: 3,
    });
  });
  it('returns zeros when the RPC returns no row', () => {
    expect(toSpendingSummary(undefined)).toEqual({ totalDop: 0, previousTotalDop: 0, txCount: 0 });
  });
});
