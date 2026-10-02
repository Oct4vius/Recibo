begin;
select plan(6);

-- Se evalúa después de TODAS las migraciones: ninguna tabla/vista de public puede tener grants para anon.
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'),
  0::bigint,
  'anon has no table or view grants in public'
);
select ok(
  (select count(*) from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public') > 0,
  'authenticated keeps its grants (RLS is what restricts rows)'
);
select is(has_table_privilege('anon', 'public.profiles', 'select'), false, 'anon cannot even attempt to read profiles');

-- PUBLIC concede EXECUTE por defecto a toda función nueva; anon (que hereda de PUBLIC) no debe ejecutar ninguna en public.
select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and has_function_privilege('anon', oid, 'execute')),
  0::bigint,
  'anon (nor PUBLIC) can execute no function in public'
);
select ok(
  has_function_privilege('authenticated', 'public.get_spending_summary(public.budget_period, date)', 'execute')
  and has_function_privilege('authenticated', 'public.get_history(text, date, date)', 'execute'),
  'authenticated keeps EXECUTE on the aggregate RPCs'
);
-- Tablas escritas solo por el service role: authenticated no conserva privilegios de escritura (RLS ya lo impedía; defensa en profundidad)
select is(
  (select count(*) from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public'
      and table_name in ('linked_accounts', 'budget_alerts', 'sync_logs', 'unparsed_emails')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
  0::bigint,
  'authenticated has no write grants on service-only tables'
);

select * from finish();
rollback;
