import { describe, expect, it } from 'vitest';
import { googleAuthorizeUrl } from '../../../scripts/lib/google-login';

describe('google-login', () => {
  it('builds the Google authorize URL with offline access, forced consent and read-only scopes', () => {
    const url = new URL(googleAuthorizeUrl('123-abc.apps.googleusercontent.com', 'state-xyz'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: '123-abc.apps.googleusercontent.com',
      redirect_uri: 'http://localhost:53682/callback',
      response_type: 'code',
      scope: 'openid email https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent select_account',
      state: 'state-xyz',
    });
  });
});
