/** Preferencia por computadora: '1' encendida, sin clave apagada (igual que en el teléfono). */
export const PREFERENCE_KEY = 'recibo:device-alerts';

export interface AlertPreference {
  read(): Promise<boolean>;
  write(on: boolean): Promise<void>;
}

export function createAlertPreference(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): AlertPreference {
  return {
    async read() {
      return storage.getItem(PREFERENCE_KEY) === '1';
    },
    async write(on) {
      if (on) storage.setItem(PREFERENCE_KEY, '1');
      else storage.removeItem(PREFERENCE_KEY);
    },
  };
}
