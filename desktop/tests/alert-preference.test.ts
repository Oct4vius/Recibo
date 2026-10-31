import { describe, expect, it } from 'vitest';
import { createAlertPreference, PREFERENCE_KEY } from '@desktop/alerts/alert-preference';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe('createAlertPreference', () => {
  it('la preferencia arranca apagada y se guarda', async () => {
    const storage = memoryStorage();
    const preference = createAlertPreference(storage);
    expect(await preference.read()).toBe(false);
    await preference.write(true);
    expect(await preference.read()).toBe(true);
    expect(storage.data.get(PREFERENCE_KEY)).toBe('1');
    await preference.write(false);
    expect(await preference.read()).toBe(false);
    expect(storage.data.has(PREFERENCE_KEY)).toBe(false);
  });
});
