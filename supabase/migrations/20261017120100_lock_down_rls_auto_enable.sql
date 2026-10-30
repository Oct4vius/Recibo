-- `public.rls_auto_enable()` la crea Supabase solo en el remoto (trigger de eventos que activa RLS en tablas nuevas)
-- y quedó ejecutable por PUBLIC/anon/authenticated (advisor). Localmente no existe y el cierre se omite.
-- Es una función de apoyo con nombre propio para poder probar la lógica sin la función de Supabase.
create or replace function public.lock_down_rls_auto_enable()
returns void
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'rls_auto_enable' and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

revoke execute on function public.lock_down_rls_auto_enable() from public, anon, authenticated;
grant execute on function public.lock_down_rls_auto_enable() to postgres, service_role;

select public.lock_down_rls_auto_enable();
