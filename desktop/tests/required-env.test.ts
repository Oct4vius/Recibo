import { describe, expect, it } from 'vitest';
import { envProblems, missingEnv } from '../src/build/required-env';

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

describe('envProblems', () => {
  const valid = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(30),
    EXPO_PUBLIC_MS_CLIENT_ID: '12345678-1234-1234-1234-123456789abc',
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123-abc.apps.googleusercontent.com',
  };

  it('acepta una configuración válida', () => {
    expect(envProblems(valid)).toEqual([]);
  });

  it('nombra la variable mal formada sin su valor', () => {
    const problems = envProblems({ ...valid, EXPO_PUBLIC_MS_CLIENT_ID: 'no-es-guid' });
    expect(problems).toEqual(['EXPO_PUBLIC_MS_CLIENT_ID']);
    expect(problems.join()).not.toContain('no-es-guid');
  });

  it('no repite lo que falta', () => {
    expect(envProblems({ ...valid, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '' })).toEqual(['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID']);
  });
});
