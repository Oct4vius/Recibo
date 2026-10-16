-- Cron de la tasa del dólar (Plan 3c). La URL y el secreto viven en Vault (repo público: ninguna migración los contiene).
-- Sin configuración (p. ej. en local) no hace nada.
create or replace function public.invoke_fetch_usd_rates()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select s.decrypted_secret into v_url from vault.decrypted_secrets s where s.name = 'fetch_usd_rates_url';
  select s.decrypted_secret into v_secret from vault.decrypted_secrets s where s.name = 'fetch_usd_rates_secret';
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

revoke execute on function public.invoke_fetch_usd_rates() from public, anon, authenticated;
grant execute on function public.invoke_fetch_usd_rates() to service_role;

-- 13:00 y 23:00 UTC = 09:00 y 19:00 en Santo Domingo (UTC-4 todo el año). El archivo del BCRD se actualiza
-- hacia las 17:50 hora dominicana, así que la corrida de la tarde cae después de la publicación.
select cron.schedule('fetch-usd-rates', '0 13,23 * * *', 'select public.invoke_fetch_usd_rates()');
