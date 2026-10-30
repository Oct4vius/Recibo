const REQUIRED = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_MS_CLIENT_ID',
  // Opcional en el teléfono, pero un instalador sin Gmail dejaría a la gente sin poder vincularlo.
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
] as const;

/** Variables que faltan (o están vacías) para compilar un instalador. */
export function missingEnv(env: Record<string, string | undefined>): string[] {
  return REQUIRED.filter((name) => (env[name] ?? '').trim() === '');
}
