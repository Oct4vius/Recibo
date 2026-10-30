import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { useEffect, useRef, useState } from 'react';
import { shouldCheckUpdate } from './update-state';
import './update.css';

type Phase = 'idle' | 'installing' | 'failed';

/** Avisa de una versión nueva. Nunca actualiza sin el clic en `Actualizar`; si la revisión falla, no muestra nada. */
export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const lastAt = useRef<number | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const run = () => {
      const now = Date.now();
      if (!shouldCheckUpdate(lastAt.current, now)) return;
      check()
        .then((found) => {
          // Solo una revisión lograda frena las siguientes: un fallo al arrancar no bloquea 6 horas.
          lastAt.current = now;
          if (found) setUpdate(found);
        })
        .catch(() => undefined);
    };
    run();
    window.addEventListener('focus', run);
    return () => window.removeEventListener('focus', run);
  }, []);

  if (!update) return null;

  const install = () => {
    setPhase('installing');
    // El instalador reenvía los argumentos (p. ej. --hidden): la marca hace que la ventana vuelva a verse.
    invoke('mark_update_restart')
      .then(() => update.downloadAndInstall())
      .then(() => relaunch())
      .catch(() => {
        void invoke('clear_update_restart').catch(() => undefined);
        setPhase('failed');
      });
  };

  return (
    <div className="update-banner" role="status">
      <span>{phase === 'installing' ? 'Actualizando…' : 'Hay una versión nueva'}</span>
      <button type="button" className="btn-primary" onClick={install} disabled={phase === 'installing'}>
        Actualizar
      </button>
      {phase === 'failed' && <span className="form-error">No se pudo actualizar. Inténtalo más tarde.</span>}
    </div>
  );
}
