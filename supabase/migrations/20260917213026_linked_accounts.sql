create table public.linked_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.mail_provider not null,
  email text not null,
  -- id del secreto en vault.secrets con el refresh token. NUNCA el token en claro.
  vault_secret_id uuid,
  -- Gmail: historyId; Outlook: deltaLink. Opaco para la app.
  sync_cursor text,
  status public.account_status not null default 'active',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index linked_accounts_user_provider_email_key
  on public.linked_accounts (user_id, provider, lower(email));

create trigger linked_accounts_set_updated_at
  before update on public.linked_accounts
  for each row execute function public.set_updated_at();

alter table public.linked_accounts enable row level security;
revoke insert, update, delete, truncate on public.linked_accounts from authenticated;

-- El usuario solo lee. Vincular/desvincular pasa por Edge Functions (service role).
create policy linked_accounts_select_own on public.linked_accounts
  for select to authenticated
  using ((select auth.uid()) = user_id);
