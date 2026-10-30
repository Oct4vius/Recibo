import { parseEnv } from '../../../src/lib/env-schema';

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

/** Nombres de las variables ausentes o mal formadas (nunca sus valores); vacío si el instalador puede compilarse. */
export function envProblems(env: Record<string, string | undefined>): string[] {
  const problems = missingEnv(env);
  try {
    parseEnv(env);
  } catch (error) {
    // El mensaje de `parseEnv` solo trae nombres de variables.
    const names = (error instanceof Error ? error.message : '').split(': ').slice(1).join(': ').split(', ');
    for (const name of names) if (name.startsWith('EXPO_PUBLIC_') && !problems.includes(name)) problems.push(name);
  }
  return problems;
}
