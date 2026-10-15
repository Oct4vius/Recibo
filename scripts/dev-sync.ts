// Dispara sync-mail como lo haría el cron. Uso: bun run dev:sync [--target local|remote].
// Local: SYNC_MAIL_SECRET de supabase/functions/.env. Remoto: SYNC_MAIL_SECRET de .env.local.
import { functionsEnv, parseTarget, supabaseApi } from './lib/dev-target';

async function main(): Promise<void> {
  const target = parseTarget(process.argv.slice(2));
  const { url, anonKey } = supabaseApi(target);
  const secret = target === 'local' ? functionsEnv().SYNC_MAIL_SECRET : process.env.SYNC_MAIL_SECRET;
  if (!secret) throw new Error('Falta SYNC_MAIL_SECRET');
  const response = await fetch(`${url}/functions/v1/sync-mail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, apikey: anonKey },
  });
  console.log(`sync-mail → ${response.status}`, JSON.stringify(await response.json(), null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
