import { describe, expect, it } from 'vitest';
import { shouldRunCheck } from '@desktop/alerts/alert-timing';

describe('shouldRunCheck', () => {
  it('no revisa dos veces seguidas', () => {
    expect(shouldRunCheck(null, 1000)).toBe(true);
    expect(shouldRunCheck(1000, 30_000)).toBe(false);
    expect(shouldRunCheck(1000, 61_000)).toBe(true);
  });
});
