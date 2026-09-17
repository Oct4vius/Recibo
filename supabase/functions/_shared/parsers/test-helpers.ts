import type { RawEmail } from './types.ts';

/** Carga una fixture JSON (RawEmail) generada por `bun run fixtures:build`. Solo para tests. */
export function loadFixture(bank: string, name: string): RawEmail {
  const url = new URL(`./${bank}/fixtures/${name}.json`, import.meta.url);
  return JSON.parse(Deno.readTextFileSync(url)) as RawEmail;
}
