import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createSecureSessionStorage } from '@/lib/secure-session-storage';
import { env } from './env';
import { keyringStore } from './keyring';

const localStorageStore = {
  get: async (key: string) => localStorage.getItem(key),
  set: async (key: string, value: string) => localStorage.setItem(key, value),
  remove: async (key: string) => localStorage.removeItem(key),
};

export const supabase = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    // La clave AES-256 va en el Administrador de credenciales y la sesión cifrada en localStorage.
    storage: createSecureSessionStorage(keyringStore, localStorageStore),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
