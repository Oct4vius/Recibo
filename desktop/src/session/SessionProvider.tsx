import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SessionContext, type SessionState } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';
import icon from '../../src-tauri/icons/128x128@2x.png';
import { LoginScreen } from './LoginScreen';
import { OfflineScreen } from './OfflineScreen';
import { takeUserSignOut } from './sign-out';
import { phaseAfterEvent, phaseAfterLoad, type SessionPhase } from './session-state';

const OFFLINE_RETRY_MS = 15_000;

// Un fallo del keyring no debe dejar el logo para siempre: se vuelve un error más.
function readStoredSession(): Promise<{ session: Session | null; error: unknown }> {
  return supabase.auth
    .getSession()
    .then(({ data, error }) => ({ session: data.session, error }))
    .catch((error: unknown) => ({ session: null, error }));
}

/** Lee la sesión guardada y la mantiene al día. Sin sesión nunca monta la app: una consulta iría con la anon key. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      readStoredSession().then((result) => {
        if (!active) return;
        if (result.session) setSession(result.session);
        setPhase((current) => phaseAfterLoad(current, result));
      });
    void load();
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      const userSignedOut = event === 'SIGNED_OUT' ? takeUserSignOut() : false;
      if (event !== 'INITIAL_SESSION') setSession(next);
      setPhase((current) => phaseAfterEvent(current, event, next, userSignedOut));
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  // Sin internet se reintenta solo; el fallo de refresco queda en caché 60 s, por eso no hay botón.
  useEffect(() => {
    if (phase !== 'offline') return;
    let active = true;
    const id = setInterval(() => {
      readStoredSession().then((result) => {
        if (!active) return;
        if (result.session) setSession(result.session);
        setPhase((current) => phaseAfterLoad(current, result));
      });
    }, OFFLINE_RETRY_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [phase]);

  const value = useMemo<SessionState>(() => ({ session, loading: false }), [session]);

  switch (phase) {
    case 'loading':
      return (
        <div className="splash">
          <img src={icon} alt="Recibo" />
        </div>
      );
    case 'offline':
      return <OfflineScreen />;
    case 'signed-out':
      return <LoginScreen />;
    case 'expired':
      return <LoginScreen expired />;
    case 'signed-in':
      return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
  }
}
