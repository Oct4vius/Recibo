import { describe, expect, it } from 'vitest';
import { toSpendingSummary } from '@/features/summary/mapping';

describe('toSpendingSummary', () => {
  it('maps the RPC row, including the period bounds', () => {
    expect(
      toSpendingSummary({
        total_dop: 1045.72,
        previous_total_dop: 100,
        tx_count: 3,
        period_start: '2026-10-05',
        period_end: '2026-10-12',
      }),
    ).toEqual({ totalDop: 1045.72, previousTotalDop: 100, txCount: 3, periodStart: '2026-10-05', periodEnd: '2026-10-12' });
  });
  it('returns zeros and no bounds when the RPC returns no row', () => {
    expect(toSpendingSummary(undefined)).toEqual({
      totalDop: 0,
      previousTotalDop: 0,
      txCount: 0,
      periodStart: null,
      periodEnd: null,
    });
  });
});
