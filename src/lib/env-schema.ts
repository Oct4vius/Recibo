import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export type Env = z.infer<typeof schema>;

/** Valida la configuración pública de la app. El error nombra cada variable inválida. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas o ausentes: ${names}`);
  }
  return result.data;
}
