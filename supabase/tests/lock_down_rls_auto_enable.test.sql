begin;
select plan(6);

select has_function('public', 'lock_down_rls_auto_enable', 'the helper exists');
select ok(not has_function_privilege('anon', 'public.lock_down_rls_auto_enable()', 'execute'), 'anon cannot run the helper');
select ok(not has_function_privilege('authenticated', 'public.lock_down_rls_auto_enable()', 'execute'), 'authenticated cannot run the helper');
select ok(has_function_privilege('service_role', 'public.lock_down_rls_auto_enable()', 'execute'), 'service_role can run the helper');

-- Sin la función de Supabase (local) el helper no falla
select lives_ok($$select public.lock_down_rls_auto_enable()$$, 'the helper is a no-op when rls_auto_enable is absent');

-- Con una función equivalente, anon y authenticated pierden EXECUTE
create function public.rls_auto_enable() returns void language sql as $f$ select $f$;
grant execute on function public.rls_auto_enable() to public, anon, authenticated;
select public.lock_down_rls_auto_enable();
select ok(
  not has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
    and not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute'),
  'anon and authenticated lose EXECUTE on rls_auto_enable'
);

select * from finish();
rollback;
