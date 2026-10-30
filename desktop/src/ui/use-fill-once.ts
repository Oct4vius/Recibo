import { useEffect, useState } from 'react';

/** Claves ya jugadas en esta sesión: al volver a una pantalla la barra aparece llena, sin animar de nuevo. */
const played = new Set<string>();

/**
 * `true` un frame después de `enabled` (la barra pasa de vacía a llena una vez); de inmediato si la clave ya se jugó.
 * Solo marca la clave con `enabled === true`.
 */
export function useFillOnce(key: string, enabled: boolean): boolean {
  const [armedKey, setArmedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || played.has(key)) return;
    const id = requestAnimationFrame(() => {
      played.add(key);
      setArmedKey(key);
    });
    return () => cancelAnimationFrame(id);
  }, [key, enabled]);
  return played.has(key) || armedKey === key;
}
