-- Volver a vincular una cuenta en error conserva su cursor si es válido (así no se reimporta un mes entero),
-- pero descarta `next` y `maxSeen` (una paginación a medias ya no vale con un token nuevo).
-- Cursor ausente, ilegible, sin `since` válido o de una cuenta revocada: cursor inicial, como antes.
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
  v_cursor text;
  v_since text;
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

    if v_account.status = 'active' and v_account.sync_cursor is not null then
      v_cursor := v_account.sync_cursor;
    else
      v_cursor := null;
      if v_account.status = 'error' and v_account.sync_cursor is not null then
        begin
          v_since := v_account.sync_cursor::jsonb ->> 'since';
          if v_since is not null then
            perform v_since::timestamptz;
            v_cursor := jsonb_build_object('since', v_since, 'next', null, 'maxSeen', null)::text;
          end if;
        exception when others then
          v_cursor := null;
        end;
      end if;
      v_cursor := coalesce(v_cursor, public.initial_sync_cursor(p_user_id));
    end if;

    update public.linked_accounts
      set vault_secret_id = v_secret,
          status = 'active',
          last_error = null,
          sync_cursor = v_cursor
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

revoke execute on function public.link_mail_account(uuid, public.mail_provider, text, text) from public, anon, authenticated;
grant execute on function public.link_mail_account(uuid, public.mail_provider, text, text) to service_role;
