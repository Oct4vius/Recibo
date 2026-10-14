export const GENERIC_FUNCTION_ERROR = 'No se pudo completar. Revisa tu conexión e inténtalo otra vez.';

/** Mensaje en español que devuelve la Edge Function (`{ error }`), o uno genérico. */
export async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.json()) as { error?: unknown };
      if (typeof body.error === 'string') return body.error;
    } catch {
      return GENERIC_FUNCTION_ERROR;
    }
  }
  return GENERIC_FUNCTION_ERROR;
}
