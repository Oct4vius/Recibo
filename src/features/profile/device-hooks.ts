import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { deviceTimeZone } from './device-time-zone';

/** Zona del teléfono; se vuelve a leer cada vez que la app pasa a primer plano (el usuario pudo cambiarla en Android). */
export function useDeviceTimeZone(): string {
  const [zone, setZone] = useState(deviceTimeZone);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setZone(deviceTimeZone());
    });
    return () => subscription.remove();
  }, []);
  return zone;
}
