create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'America/Santo_Domingo',
  primary_currency public.currency_code not null default 'DOP',
  -- Tasa fija DOP por USD para totales consolidados (ALCANCE 3.5)
  usd_rate numeric(10,4) not null default 60.0000 check (usd_rate > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sin policy de insert/delete: el perfil lo crea el trigger y muere con el usuario.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill: usuarios que ya existían antes de esta migración (el trigger solo cubre altas nuevas).
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
