import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import type { Database } from '@/types/database';
import { env } from './env';
import { createSecureSessionStorage } from './secure-session-storage';

export const supabase = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    // La clave AES-256 vive en SecureStore (límite ~2 KB) y la sesión cifrada en AsyncStorage.
    storage: createSecureSessionStorage(
      {
        get: (key) => SecureStore.getItemAsync(key),
        set: (key, value) => SecureStore.setItemAsync(key, value),
        delete: (key) => SecureStore.deleteItemAsync(key),
      },
      {
        get: (key) => AsyncStorage.getItem(key),
        set: (key, value) => AsyncStorage.setItem(key, value),
        remove: (key) => AsyncStorage.removeItem(key),
      },
    ),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresca el token solo mientras la app está en primer plano.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
