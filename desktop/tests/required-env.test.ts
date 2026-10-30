import { describe, expect, it } from 'vitest';
import { missingEnv } from '../src/build/required-env';

describe('missingEnv', () => {
  it('nombra lo que falta', () => {
    expect(missingEnv({})).toEqual([
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_MS_CLIENT_ID',
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    ]);
    expect(
      missingEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'x',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'x',
        EXPO_PUBLIC_MS_CLIENT_ID: 'x',
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '',
      }),
    ).toEqual(['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID']);
  });
});
