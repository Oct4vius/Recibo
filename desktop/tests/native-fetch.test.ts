import { describe, expect, it } from 'vitest';
import { usesNativeFetch } from '../src/lib/native-fetch';

describe('usesNativeFetch', () => {
  it('solo las funciones van por Rust', () => {
    expect(usesNativeFetch('https://abc.supabase.co/functions/v1/link-account')).toBe(true);
    expect(usesNativeFetch('http://127.0.0.1:54321/functions/v1/unlink-account')).toBe(true);
    expect(usesNativeFetch('https://abc.supabase.co/rest/v1/transactions')).toBe(false);
    expect(usesNativeFetch('https://abc.supabase.co/auth/v1/token')).toBe(false);
    expect(usesNativeFetch('https://abc.supabase.co/rest/v1/x?y=/functions/v1/')).toBe(false);
  });
});
