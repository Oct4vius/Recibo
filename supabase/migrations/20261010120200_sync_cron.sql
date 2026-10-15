-- Cron del sync (Plan 3a). La URL y el secreto viven en Vault (repo público: ninguna migración los contiene).
-- Sin configuración (p. ej. en local) no hace nada.
create or replace function public.invoke_sync_mail()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select s.decrypted_secret into v_url from vault.decrypted_secrets s where s.name = 'sync_mail_url';
  select s.decrypted_secret into v_secret from vault.decrypted_secrets s where s.name = 'sync_mail_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;
  return net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke execute on function public.invoke_sync_mail() from public, anon, authenticated;
grant execute on function public.invoke_sync_mail() to service_role;

select cron.schedule('sync-mail', '*/15 * * * *', 'select public.invoke_sync_mail()');
