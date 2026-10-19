import { useEffect, useState, type ReactNode } from 'react';
import { cleanupWithoutSession, disableDeviceAlerts, sessionState } from '@/features/notifications/flows';
import { nativePort } from '@/features/notifications/native-port';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { SessionContext, type SessionState } from './session-context';

/** Lee la sesión una sola vez y la comparte. Al cerrarse la sesión (por cualquier vía) borra la caché. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        setState({ session: data.session, loading: false });
        cleanupWithoutSession(sessionState({ session: data.session, error }), nativePort).catch(() => undefined);
      })
      .catch(() => setState({ session: null, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        // La preferencia es de este teléfono y de esta sesión: se borra y se cancela la tarea.
        disableDeviceAlerts(nativePort).catch(() => undefined);
      }
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
