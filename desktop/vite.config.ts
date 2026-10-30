import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { aliases, dedupe } from './aliases.ts';
import { nativeImportGuard } from './src/build/native-import-guard.ts';

export default defineConfig({
  plugins: [nativeImportGuard(), react()],
  // Lee solo EXPO_PUBLIC_* del .env.local de la raíz (los mismos valores que el teléfono).
  envDir: '..',
  envPrefix: 'EXPO_PUBLIC_',
  resolve: { alias: aliases, dedupe },
  clearScreen: false,
  server: { port: 1420, strictPort: true, fs: { allow: ['..'] } },
});
