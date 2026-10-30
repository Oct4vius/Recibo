import { signOut } from '@/features/auth/api';

let requestedByUser = false;

/** Cierra sesión por decisión de la usuaria: así SIGNED_OUT no se confunde con una sesión vencida. */
export async function signOutByUser(): Promise<void> {
  requestedByUser = true;
  await signOut();
}

/** Lee y limpia la marca de `signOutByUser`. */
export function takeUserSignOut(): boolean {
  const value = requestedByUser;
  requestedByUser = false;
  return value;
}
