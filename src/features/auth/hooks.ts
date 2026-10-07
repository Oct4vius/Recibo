import { useContext } from 'react';
import { SessionContext, type SessionState } from './session-context';

/** Sesión actual compartida por SessionProvider. */
export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (!state) throw new Error('useSession debe usarse dentro de SessionProvider');
  return state;
}

/** Id del usuario con sesión iniciada. Solo para pantallas protegidas (detrás de Stack.Protected). */
export function useUserId(): string {
  const { session } = useSession();
  if (!session) throw new Error('No hay sesión iniciada');
  return session.user.id;
}
