-- Borrar una cuenta vinculada (o el usuario, por la cascada de auth.users) borra también su refresh token de Vault.
-- Antes solo unlink_mail_account lo borraba: borrar un usuario desde el dashboard dejaba un token de correo vivo y
-- descifrable sin dueño.
create or replace function public.linked_accounts_delete_vault_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets s
  where s.id = old.vault_secret_id or s.name = 'mail-token-' || old.id::text;
  return old;
end;
$$;

revoke execute on function public.linked_accounts_delete_vault_secret() from public, anon, authenticated;

create trigger linked_accounts_delete_vault_secret
  before delete on public.linked_accounts
  for each row execute function public.linked_accounts_delete_vault_secret();

-- Limpieza única: tokens de correo en Vault que ya no pertenecen a ninguna cuenta vinculada.
delete from vault.secrets s
where s.name like 'mail-token-%'
  and not exists (select 1 from public.linked_accounts a where a.vault_secret_id = s.id);
