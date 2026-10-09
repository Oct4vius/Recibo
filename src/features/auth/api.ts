import { supabase } from '@/lib/supabase';
import { authErrorMessage, currentPasswordErrorMessage, passwordUpdateErrorMessage } from './errors';

/** Inicia sesión. Devuelve el mensaje de error en español, o `null` si salió bien. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return authErrorMessage(error);
}

/** Cierra sesión. La caché del usuario anterior la descarta `SessionProvider` al recibir `SIGNED_OUT`. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Verifica la contraseña actual iniciando sesión otra vez (mismo usuario: `SessionProvider` recibe SIGNED_IN y
 * conserva la caché) y guarda la nueva. Devuelve el error en español o null.
 */
export async function changePassword(email: string, current: string, next: string): Promise<string | null> {
  const check = await supabase.auth.signInWithPassword({ email, password: current });
  if (check.error) return currentPasswordErrorMessage(check.error);
  const { error } = await supabase.auth.updateUser({ password: next });
  return passwordUpdateErrorMessage(error);
}
