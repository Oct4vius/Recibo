import { useMutation } from '@tanstack/react-query';
import { useContext } from 'react';
import { changePassword } from './api';
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

/** Variables: `{ current, next }`; data: mensaje de error o null si se cambió. */
export function useChangePassword(email: string) {
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => changePassword(email, current, next),
  });
}
