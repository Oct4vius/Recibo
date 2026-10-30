import { describe, expect, it } from 'vitest';
import { createSecureSessionStorage, type BlobStore, type KeyStore } from '@/lib/secure-session-storage';

function memoryStores() {
  const keyMap = new Map<string, string>();
  const blobMap = new Map<string, string>();
  const keys: KeyStore = {
    get: async (k) => keyMap.get(k) ?? null,
    set: async (k, v) => void keyMap.set(k, v),
    delete: async (k) => void keyMap.delete(k),
  };
  const blobs: BlobStore = {
    get: async (k) => blobMap.get(k) ?? null,
    set: async (k, v) => void blobMap.set(k, v),
    remove: async (k) => void blobMap.delete(k),
  };
  return { keys, blobs, keyMap, blobMap };
}

describe('createSecureSessionStorage', () => {
  it('round-trips a session larger than 2 KB', async () => {
    const { keys, blobs } = memoryStores();
    const storage = createSecureSessionStorage(keys, blobs);
    const session = 'ñ'.repeat(2500) + 'a'.repeat(2500);
    await storage.setItem('sb-session', session);
    expect(await storage.getItem('sb-session')).toBe(session);
  });

  it('never stores the session in plain text', async () => {
    const { keys, blobs, blobMap } = memoryStores();
    const storage = createSecureSessionStorage(keys, blobs);
    await storage.setItem('sb-session', 'access_token_secreto');
    const stored = blobMap.get('sb-session');
    expect(stored).toBeDefined();
    expect(stored).not.toContain('access_token_secreto');
    expect(await blobs.get('sb-session')).toBe(stored);
  });

  it('regression — a missing key returns null instead of throwing', async () => {
    const { keys, blobs } = memoryStores();
    const storage = createSecureSessionStorage(keys, blobs);
    await storage.setItem('sb-session', 'x');
    await keys.delete('sb-session');
    expect(await storage.getItem('sb-session')).toBeNull();
  });

  it('returns null when nothing was stored', async () => {
    const { keys, blobs } = memoryStores();
    expect(await createSecureSessionStorage(keys, blobs).getItem('nada')).toBeNull();
  });

  it('removeItem clears both stores', async () => {
    const { keys, blobs, keyMap, blobMap } = memoryStores();
    const storage = createSecureSessionStorage(keys, blobs);
    await storage.setItem('sb-session', 'x');
    await storage.removeItem('sb-session');
    expect(keyMap.size).toBe(0);
    expect(blobMap.size).toBe(0);
  });
});
