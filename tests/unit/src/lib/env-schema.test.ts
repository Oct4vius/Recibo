import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env-schema';

const valid = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_0123456789abcdef',
  EXPO_PUBLIC_MS_CLIENT_ID: '11111111-2222-3333-4444-555555555555',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123456789012-abc123def456.apps.googleusercontent.com',
};

describe('parseEnv', () => {
  it('accepts a valid configuration', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });
  it('names every missing variable in the error', () => {
    expect(() => parseEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL.*EXPO_PUBLIC_SUPABASE_ANON_KEY.*EXPO_PUBLIC_MS_CLIENT_ID/);
  });
  it('rejects a URL that is not a URL', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
  it('rejects a suspiciously short key', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'short' })).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
  it('rejects a Microsoft client id that is not a GUID', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_MS_CLIENT_ID: 'recibo' })).toThrow(/EXPO_PUBLIC_MS_CLIENT_ID/);
  });
  it('rejects a Google web client id that is not a googleusercontent id', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'recibo' })).toThrow(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
  });
  it('regression — the Google web client id is optional so Outlook keeps working without it', () => {
    const { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: _omitted, ...withoutGoogle } = valid;
    expect(parseEnv(withoutGoogle)).toEqual(withoutGoogle);
    expect(() => parseEnv({ ...withoutGoogle, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'recibo' })).toThrow(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
  });
  it('regression — a blank Google client id does not break the app', () => {
    const { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: _omitted, ...rest } = valid;
    expect(parseEnv({ ...rest, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '' }).EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).toBeUndefined();
    expect(parseEnv({ ...rest, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '   ' }).EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).toBeUndefined();
    expect(() => parseEnv({ ...rest, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'recibo' })).toThrow(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
  });
});
