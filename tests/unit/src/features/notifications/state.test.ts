import { describe, expect, it } from 'vitest';
import { deviceAlertsView, shouldCheck } from '@/features/notifications/state';

describe('deviceAlertsView', () => {
  it('on only when enabled and granted', () => expect(deviceAlertsView(true, 'granted')).toEqual({ on: true, blocked: false }));
  it('off when the preference is off', () => expect(deviceAlertsView(false, 'granted')).toEqual({ on: false, blocked: false }));
  it('off and not blocked before asking', () =>
    expect(deviceAlertsView(false, 'undetermined')).toEqual({ on: false, blocked: false }));
  it('blocked after a rejection', () => expect(deviceAlertsView(false, 'denied')).toEqual({ on: false, blocked: true }));
  it('blocked when revoked in Android settings while enabled', () =>
    expect(deviceAlertsView(true, 'denied')).toEqual({ on: false, blocked: true }));
});

describe('shouldCheck', () => {
  it('only with preference and permission', () => {
    expect(shouldCheck(true, 'granted')).toBe(true);
    expect(shouldCheck(false, 'granted')).toBe(false);
    expect(shouldCheck(true, 'denied')).toBe(false);
    expect(shouldCheck(true, 'undetermined')).toBe(false);
  });
});
