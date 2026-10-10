-- Una zona inválida rompería todas las RPC (`at time zone` lanza). Se valida contra el catálogo de Postgres.
create or replace function public.profiles_validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown time zone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.profiles_validate_timezone();

revoke execute on function public.profiles_validate_timezone() from public, anon, authenticated;
