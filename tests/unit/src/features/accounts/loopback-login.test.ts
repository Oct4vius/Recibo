import { describe, expect, it } from 'vitest';
import {
  challengeFor,
  createPkce,
  googleAuthorizeUrl,
  microsoftAuthorizeUrl,
} from '@/features/accounts/loopback-login';

describe('loopback-login', () => {
  it('PKCE S256 con un valor conocido', async () => {
    // RFC 7636, apéndice B
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
  it('dos llamadas no repiten el verifier', async () => {
    expect((await createPkce()).verifier).not.toBe((await createPkce()).verifier);
  });
  it('Microsoft pide solo lectura y PKCE', () => {
    const url = new URL(microsoftAuthorizeUrl('id', 'ch', 'st'));
    expect(url.searchParams.get('scope')).toBe('openid email offline_access Mail.Read');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:53682/callback');
  });
  it('Google pide refresh token y solo lectura', () => {
    const url = new URL(googleAuthorizeUrl('id', 'st'));
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('scope')).toContain('gmail.readonly');
  });
});
