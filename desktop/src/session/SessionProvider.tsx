import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SessionContext, type SessionState } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';
import icon from '../../src-tauri/icons/128x128@2x.png';
import { LoginScreen } from './LoginScreen';
import { sessionView, type SessionView } from './session-state';

/** Lee la sesión guardada, la mantiene al día y muestra carga, inicio de sesión o la app. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoaded(true);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const view = sessionView({ loaded, session });
  const value = useMemo<SessionState>(() => ({ session, loading: false }), [session]);

  if (view === 'loading') {
    return (
      <div className="splash">
        <img src={icon} alt="Recibo" />
      </div>
    );
  }
  if (view === 'signed-out') return <LoginScreen />;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
