import { signOut } from '@/features/auth/api';

let requestedByUser = false;

/** Cierra sesión por decisión de la usuaria: así SIGNED_OUT no se confunde con una sesión vencida. */
export async function signOutByUser(): Promise<void> {
  requestedByUser = true;
  // Los suscriptores de Auth se esperan antes de que signOut termine; si no emitió SIGNED_OUT (sin red, fallo del almacén), la marca no debe quedar puesta.
  try {
    await signOut();
  } finally {
    requestedByUser = false;
  }
}

/** Lee y limpia la marca de `signOutByUser`. */
export function takeUserSignOut(): boolean {
  const value = requestedByUser;
  requestedByUser = false;
  return value;
}
