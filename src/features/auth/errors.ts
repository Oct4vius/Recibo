export interface AuthErrorLike {
  name?: string;
  code?: string;
  status?: number;
}

/** Traduce un error de Supabase Auth a un mensaje en español que dice qué pasó y qué hacer. */
export function authErrorMessage(error: AuthErrorLike | null): string | null {
  if (!error) return null;
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return 'Sin conexión. Revisa tu internet y vuelve a intentarlo.';
  }
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
