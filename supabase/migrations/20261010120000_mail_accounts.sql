-- Cuentas de correo (Plan 3a). Vault no se expone por PostgREST: estas funciones son la única puerta,
-- solo para service_role (Edge Functions). Los tokens nunca salen de Vault hacia la app.

-- pg_net fuera de public (advisor 0014). Solo se recrea si vive en public (nada lo usa todavía);
-- si ya está en extensions no se toca.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_net' and extnamespace = 'public'::regnamespace) then
    drop extension pg_net;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    create extension pg_net with schema extensions;
  end if;
end
$$;

-- Cursor inicial: día 1 del mes anterior en la zona del perfil. Mismo formato que SyncCursor
-- (supabase/functions/_shared/mail/types.ts).
create or replace function public.initial_sync_cursor(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'since', to_char(
      (date_trunc('month', (now() at time zone z.tz) - interval '1 month') at time zone z.tz) at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ),
    'next', null,
    'maxSeen', null
  )::text
  from (select coalesce((select p.timezone from public.profiles p where p.user_id = p_user_id), 'America/Santo_Domingo') as tz) z
$$;

create or replace function public.link_mail_account(
  p_user_id uuid,
  p_provider public.mail_provider,
  p_email text,
  p_refresh_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.linked_accounts%rowtype;
  v_secret uuid;
  v_id uuid;
begin
  select * into v_account
  from public.linked_accounts a
  where a.user_id = p_user_id and a.provider = p_provider and lower(a.email) = lower(p_email)
  for update;

  if found then
    if v_account.vault_secret_id is not null
      and exists (select 1 from vault.secrets s where s.id = v_account.vault_secret_id) then
      perform vault.update_secret(v_account.vault_secret_id, p_refresh_token);
      v_secret := v_account.vault_secret_id;
    else
      -- Sin secreto o con un id colgante: un secreto nuevo. Un huérfano con el mismo nombre (índice único) ya no
      -- lo referencia nadie y se borra.
      delete from vault.secrets s where s.name = 'mail-token-' || v_account.id::text;
      v_secret := vault.create_secret(p_refresh_token, 'mail-token-' || v_account.id::text, 'Refresh token de correo');
    end if;
    -- El cursor solo se conserva en una cuenta activa: una revocada o en error vuelve a empezar (repara un cursor dañado).
    update public.linked_accounts
      set vault_secret_id = v_secret,
          status = 'active',
          last_error = null,
          sync_cursor = case
            when v_account.status = 'active' and v_account.sync_cursor is not null then v_account.sync_cursor
            else public.initial_sync_cursor(p_user_id)
          end
      where id = v_account.id;
    return v_account.id;
  end if;

  insert into public.linked_accounts (user_id, provider, email, status, sync_cursor)
    values (p_user_id, p_provider, p_email, 'active', public.initial_sync_cursor(p_user_id))
    returning id into v_id;
  v_secret := vault.create_secret(p_refresh_token, 'mail-token-' || v_id::text, 'Refresh token de correo');
  update public.linked_accounts set vault_secret_id = v_secret where id = v_id;
  return v_id;
end;
$$;

create or replace function public.unlink_mail_account(p_user_id uuid, p_account_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
begin
  select a.vault_secret_id into v_secret
  from public.linked_accounts a
  where a.id = p_account_id and a.user_id = p_user_id and a.status <> 'revoked'
  for update;
  if not found then
    return false;
  end if;
  update public.linked_accounts
    set status = 'revoked', vault_secret_id = null, sync_cursor = null, last_error = null
    where id = p_account_id;
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
  return true;
end;
$$;

create or replace function public.mail_account_token(p_account_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
  from public.linked_accounts a
  join vault.decrypted_secrets s on s.id = a.vault_secret_id
  where a.id = p_account_id and a.status = 'active'
$$;

create or replace function public.set_mail_account_token(p_account_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
begin
  select a.vault_secret_id into v_secret from public.linked_accounts a where a.id = p_account_id for update;
  if v_secret is null or not exists (select 1 from vault.secrets s where s.id = v_secret) then
    raise exception 'account has no secret' using errcode = 'P0002';
  end if;
  perform vault.update_secret(v_secret, p_token);
end;
$$;

revoke execute on function public.initial_sync_cursor(uuid) from public, anon, authenticated;
revoke execute on function public.link_mail_account(uuid, public.mail_provider, text, text) from public, anon, authenticated;
revoke execute on function public.unlink_mail_account(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mail_account_token(uuid) from public, anon, authenticated;
revoke execute on function public.set_mail_account_token(uuid, text) from public, anon, authenticated;
grant execute on function public.initial_sync_cursor(uuid) to service_role;
grant execute on function public.link_mail_account(uuid, public.mail_provider, text, text) to service_role;
grant execute on function public.unlink_mail_account(uuid, uuid) to service_role;
grant execute on function public.mail_account_token(uuid) to service_role;
grant execute on function public.set_mail_account_token(uuid, text) to service_role;
