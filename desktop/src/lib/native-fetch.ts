import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const FUNCTIONS_PREFIX = '/functions/v1/';

function urlOf(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

/** Las Edge Functions no responden CORS: solo `/functions/v1/` sale por Rust. */
export function usesNativeFetch(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith(FUNCTIONS_PREFIX);
  } catch {
    return false;
  }
}

/** `fetch` de Supabase: las funciones por el plugin HTTP; lo demás, el de la ventana. */
export const appFetch: typeof fetch = (input, init) =>
  usesNativeFetch(urlOf(input)) ? tauriFetch(input, init) : fetch(input, init);
