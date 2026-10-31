import { invoke } from '@tauri-apps/api/core';
import type { KeyStore } from '@/lib/secure-session-storage';

// La clave AES vive en el Administrador de credenciales de Windows (comandos de src-tauri).
export const keyringStore: KeyStore = {
  get: (key) => invoke<string | null>('secret_get', { key }),
  set: (key, value) => invoke<void>('secret_set', { key, value }),
  delete: (key) => invoke<void>('secret_delete', { key }),
};
