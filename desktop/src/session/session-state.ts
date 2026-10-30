export type SessionView = 'loading' | 'signed-out' | 'signed-in';

/** Qué pantalla toca: mientras se lee la sesión guardada no se muestra el inicio de sesión (evita el parpadeo). */
export function sessionView(state: { loaded: boolean; session: unknown | null }): SessionView {
  if (!state.loaded) return 'loading';
  return state.session ? 'signed-in' : 'signed-out';
}
