import * as aesjs from 'aes-js';

/** Almacén pequeño y seguro para la clave AES (SecureStore en el teléfono, Credential Manager en el escritorio). */
export interface KeyStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Almacén sin límite de tamaño para la sesión cifrada (AsyncStorage / localStorage). */
export interface BlobStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * El almacén seguro no admite valores de más de ~2 KB y la sesión puede superarlo: la clave AES-256 vive en `keys`
 * y la sesión cifrada en `blobs` (patrón recomendado por Supabase). Misma clave en ambos; clave nueva en cada `setItem`.
 * Necesita `crypto.getRandomValues` global (en el teléfono lo aporta react-native-get-random-values).
 */
export function createSecureSessionStorage(keys: KeyStore, blobs: BlobStore) {
  return {
    async getItem(key: string): Promise<string | null> {
      const encrypted = await blobs.get(key);
      if (!encrypted) return null;
      const keyHex = await keys.get(key);
      if (!keyHex) return null;
      const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
      return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    },

    async setItem(key: string, value: string): Promise<void> {
      const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
      const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
      const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
      await keys.set(key, aesjs.utils.hex.fromBytes(encryptionKey));
      await blobs.set(key, aesjs.utils.hex.fromBytes(encrypted));
    },

    async removeItem(key: string): Promise<void> {
      await blobs.remove(key);
      await keys.delete(key);
    },
  };
}
