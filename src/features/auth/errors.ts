import { PASSWORD_NOT_DIFFERENT, PASSWORD_TOO_SHORT } from './password';

export interface AuthErrorLike {
  name?: string;
  code?: string;
  status?: number;
}

const OFFLINE = 'Sin conexión. Revisa tu internet y vuelve a intentarlo.';
const PASSWORD_CHANGE_FAILED = 'No se pudo cambiar la contraseña. Vuelve a intentarlo.';

function isOffline(error: AuthErrorLike): boolean {
  return error.name === 'AuthRetryableFetchError' || error.status === 0;
}

/** Traduce un error de Supabase Auth a un mensaje en español que dice qué pasó y qué hacer. */
export function authErrorMessage(error: AuthErrorLike | null): string | null {
  if (!error) return null;
  if (isOffline(error)) return OFFLINE;
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'email_not_confirmed':
      return 'Tu cuenta no está confirmada. Pídele al administrador que la confirme.';
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    default:
      return 'No se pudo iniciar sesión. Vuelve a intentarlo.';
  }
}

/** Error al verificar la contraseña actual (con `signInWithPassword`). */
export function currentPasswordErrorMessage(error: AuthErrorLike | null): string | null {
  if (!error) return null;
  if (isOffline(error)) return OFFLINE;
  if (error.code === 'invalid_credentials') return 'La contraseña actual no es correcta.';
  if (error.code === 'over_request_rate_limit') return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  return PASSWORD_CHANGE_FAILED;
}

/** Error de `updateUser({ password })`. */
export function passwordUpdateErrorMessage(error: AuthErrorLike | null): string | null {
  if (!error) return null;
  if (isOffline(error)) return OFFLINE;
  if (error.code === 'same_password') return PASSWORD_NOT_DIFFERENT;
  if (error.code === 'weak_password') return PASSWORD_TOO_SHORT;
  return PASSWORD_CHANGE_FAILED;
}
