import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { aliases, dedupe } from './aliases.ts';
import { missingEnv } from './src/build/required-env.ts';
import { nativeImportGuard } from './src/build/native-import-guard.ts';

// Lee solo EXPO_PUBLIC_* del .env.local de la raíz (los mismos valores que el teléfono).
const ENV_DIR = '..';
const ENV_PREFIX = 'EXPO_PUBLIC_';

export default defineConfig(({ command, mode }) => {
  // Compilando con Tauri, un instalador sin configuración no se genera: fallaría en la casa de quien lo instale.
  if (command === 'build' && process.env.TAURI_ENV_PLATFORM) {
    const missing = missingEnv(loadEnv(mode, ENV_DIR, ENV_PREFIX));
    if (missing.length > 0) {
      throw new Error(`Faltan variables para compilar el instalador: ${missing.join(', ')}`);
    }
  }
  return {
    plugins: [nativeImportGuard(), react()],
    envDir: ENV_DIR,
    envPrefix: ENV_PREFIX,
    resolve: { alias: aliases, dedupe },
    clearScreen: false,
    server: { port: 1420, strictPort: true, fs: { allow: ['.', '../src', '../supabase/functions/_shared'] } },
  };
});
