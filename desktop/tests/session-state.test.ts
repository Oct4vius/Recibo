import { describe, expect, it } from 'vitest';
import { sessionView } from '@desktop/session/session-state';

describe('sessionView', () => {
  it('is loading until the stored session was read', () => {
    expect(sessionView({ loaded: false, session: null })).toBe('loading');
  });
  it('is signed-out when loaded without session', () => {
    expect(sessionView({ loaded: true, session: null })).toBe('signed-out');
  });
  it('is signed-in when loaded with session', () => {
    expect(sessionView({ loaded: true, session: {} })).toBe('signed-in');
  });
});
