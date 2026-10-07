import { supabase } from '@/lib/supabase';
import { authErrorMessage } from './errors';

/** Inicia sesión. Devuelve el mensaje de error en español, o `null` si salió bien. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return authErrorMessage(error);
}

/** Cierra sesión. La caché del usuario anterior la descarta `SessionProvider` al recibir `SIGNED_OUT`. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
