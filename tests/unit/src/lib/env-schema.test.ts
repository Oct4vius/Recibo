import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env-schema';

const valid = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_0123456789abcdef',
};

describe('parseEnv', () => {
  it('accepts a valid configuration', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });
  it('names every missing variable in the error', () => {
    expect(() => parseEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL.*EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
  it('rejects a URL that is not a URL', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
  it('rejects a suspiciously short key', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'short' })).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
