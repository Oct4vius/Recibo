import { describe, expect, it } from 'vitest';
import { authorizeUrl, base64Url, createPkce, LOOPBACK_REDIRECT, MS_SCOPES } from '../../../scripts/lib/ms-login';
import { createHash } from 'node:crypto';

describe('ms-login', () => {
  it('encodes base64url without padding', () => {
    expect(base64Url(new Uint8Array([251, 255, 191]))).toBe('-_-_');
  });
  it('derives the S256 challenge from the verifier (RFC 7636)', () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(base64Url(createHash('sha256').update(verifier).digest()));
  });
  it('builds the authorize URL with PKCE, loopback redirect and read-only scopes', () => {
    const url = new URL(authorizeUrl('client-123', 'challenge-abc', 'state-xyz'));
    expect(url.origin + url.pathname).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-123',
      response_type: 'code',
      redirect_uri: LOOPBACK_REDIRECT,
      response_mode: 'query',
      scope: MS_SCOPES,
      code_challenge: 'challenge-abc',
      code_challenge_method: 'S256',
      state: 'state-xyz',
      prompt: 'select_account',
    });
  });
});
