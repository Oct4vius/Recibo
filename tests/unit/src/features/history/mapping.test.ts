import { describe, expect, it } from 'vitest';
import { toHistoryBucket } from '@/features/history/mapping';
import { localDate } from '@/lib/dates';

describe('toHistoryBucket', () => {
  it('maps the RPC row', () => {
    expect(toHistoryBucket({ bucket_start: '2026-10-05', total_dop: 4275.72, tx_count: 12 })).toEqual({
      start: localDate(2026, 10, 5),
      startIso: '2026-10-05',
      totalDop: 4275.72,
      txCount: 12,
    });
  });
});
