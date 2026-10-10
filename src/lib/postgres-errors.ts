/** SQLSTATE de un error de PostgREST/Postgres (p. ej. `23505`), o null si no lo trae. */
export function postgresCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

export const UNIQUE_VIOLATION = '23505';
export const CHECK_VIOLATION = '23514';
