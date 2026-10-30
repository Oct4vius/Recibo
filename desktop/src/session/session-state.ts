import { isAuthRetryableFetchError, type AuthChangeEvent } from '@supabase/supabase-js';

export type SessionPhase = 'loading' | 'offline' | 'signed-out' | 'expired' | 'signed-in';

/**
 * Fase tras leer la sesión guardada. Solo actúa en `loading` y `offline`: una carga tardía
 * no debe pisar una sesión ya abierta. Sin red la sesión guardada se conserva (`offline`);
 * cualquier otro error (token rechazado, fallo del almacén) pide la contraseña (`expired`).
 */
export function phaseAfterLoad(current: SessionPhase, result: { session: unknown | null; error: unknown }): SessionPhase {
  if (current !== 'loading' && current !== 'offline') return current;
  if (result.session) return 'signed-in';
  if (!result.error) return 'signed-out';
  return isAuthRetryableFetchError(result.error) ? 'offline' : 'expired';
}

/** Fase tras un evento de Auth. `INITIAL_SESSION` llega nulo también sin red: no sirve para decidir. */
export function phaseAfterEvent(current: SessionPhase, event: AuthChangeEvent, session: unknown | null, userSignedOut: boolean): SessionPhase {
  if (event === 'INITIAL_SESSION') return current;
  if (event === 'SIGNED_OUT') return userSignedOut ? 'signed-out' : 'expired';
  return session ? 'signed-in' : current;
}
