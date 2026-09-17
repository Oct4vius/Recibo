begin;
select plan(3);

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

select * from finish();
rollback;
