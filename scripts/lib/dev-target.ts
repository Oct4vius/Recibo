import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export type Target = 'local' | 'remote';

export function parseTarget(argv: readonly string[]): Target {
  const index = argv.indexOf('--target');
  const value = index === -1 ? 'local' : argv[index + 1];
  if (value !== 'local' && value !== 'remote') throw new Error('--target debe ser local o remote');
  return value;
}

export function parseEnvLines(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"(.*)"$/, '$1');
  }
  return result;
}

/** URL de la API y anon key del objetivo. Local: `supabase status`; remoto: `.env.local` (Bun lo carga solo). */
export function supabaseApi(target: Target): { url: string; anonKey: string } {
  if (target === 'remote') {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env.local');
    return { url, anonKey };
  }
  const status = parseEnvLines(execSync('bunx supabase status -o env', { encoding: 'utf8' }));
  if (!status.API_URL || !status.ANON_KEY) throw new Error('Supabase local no está corriendo (bun run db:start)');
  return { url: status.API_URL, anonKey: status.ANON_KEY };
}

/** Secretos locales de las funciones (supabase/functions/.env). */
export function functionsEnv(): Record<string, string> {
  return parseEnvLines(readFileSync('supabase/functions/.env', 'utf8'));
}
