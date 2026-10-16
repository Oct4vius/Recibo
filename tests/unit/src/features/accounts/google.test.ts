import { describe, expect, it } from 'vitest';
import { GOOGLE_MESSAGES, googleLinkStep, googleSignInConfig } from '@/features/accounts/google';

describe('googleSignInConfig', () => {
  it('asks for offline access, forces a refresh-token code and only reads Gmail', () => {
    expect(googleSignInConfig('123-abc.apps.googleusercontent.com')).toEqual({
      webClientId: '123-abc.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
  });
});

describe('googleLinkStep', () => {
  it('hands over only the server auth code', () => {
    expect(googleLinkStep({ type: 'success', data: { serverAuthCode: '4/abc' } })).toEqual({ kind: 'code', code: '4/abc' });
  });
  it('explains a missing code, a cancelled login and anything else', () => {
    expect(googleLinkStep({ type: 'success', data: { serverAuthCode: null } })).toEqual({ kind: 'message', message: GOOGLE_MESSAGES.noCode });
    expect(googleLinkStep({ type: 'cancelled', data: null })).toEqual({ kind: 'message', message: GOOGLE_MESSAGES.cancelled });
    expect(googleLinkStep({ type: 'noSavedCredentialFound', data: null })).toEqual({ kind: 'message', message: GOOGLE_MESSAGES.failed });
  });
});
