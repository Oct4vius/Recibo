import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from './errors';

/** Inicia sesión. Devuelve el mensaje de error en español, o `null` si salió bien. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return authErrorMessage(error);
}

/** Cierra sesión y descarta los datos en caché del usuario anterior. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  queryClient.clear();
}
