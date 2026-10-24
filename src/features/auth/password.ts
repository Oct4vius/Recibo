/** Mismo mínimo que `minimum_password_length` de Supabase Auth (config.toml y dashboard). */
export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordChange {
  current: string;
  next: string;
  repeat: string;
}

export const PASSWORD_TOO_SHORT = `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
export const PASSWORD_NOT_DIFFERENT = 'La nueva contraseña debe ser distinta de la actual.';

/**
 * Atributos de `updateUser` para cambiar la contraseña. Incluye la actual para que Supabase Auth la verifique en el
 * servidor ("Require current password when updating"): el chequeo de la app solo no frena a quien tenga la sesión.
 */
export function passwordUpdate(current: string, next: string): { password: string; current_password: string } {
  return { password: next, current_password: current };
}

export function passwordChangeError({ current, next, repeat }: PasswordChange): string | null {
  if (current.length === 0) return 'Escribe tu contraseña actual.';
  if (next.length < MIN_PASSWORD_LENGTH) return PASSWORD_TOO_SHORT;
  if (next !== repeat) return 'Las contraseñas no coinciden.';
  if (next === current) return PASSWORD_NOT_DIFFERENT;
  return null;
}
