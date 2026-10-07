import type { Session } from '@supabase/supabase-js';
import { createContext } from 'react';

export interface SessionState {
  session: Session | null;
  loading: boolean;
}

/** null = fuera de SessionProvider (error de programación). */
export const SessionContext = createContext<SessionState | null>(null);
