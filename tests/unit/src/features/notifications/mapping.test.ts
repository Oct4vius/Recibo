import { describe, expect, it } from 'vitest';
import { toClaimedAlerts } from '@/features/notifications/mapping';

describe('toClaimedAlerts', () => {
  it('keeps known thresholds in order', () =>
    expect(
      toClaimedAlerts([
        { period: 'week', threshold: 100 },
        { period: 'month', threshold: 80 },
      ]),
    ).toEqual([
      { period: 'week', threshold: 100 },
      { period: 'month', threshold: 80 },
    ]));
  it('drops unknown thresholds', () => expect(toClaimedAlerts([{ period: 'week', threshold: 50 }])).toEqual([]));
});
