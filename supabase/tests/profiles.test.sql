begin;
select plan(13);

select has_table('public', 'profiles', 'profiles exists');
select col_type_is('public', 'profiles', 'usd_rate', 'numeric(10,4)', 'usd_rate is numeric(10,4)');
select is((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), true, 'RLS enabled on profiles');
select policies_are('public', 'profiles', array['profiles_select_own', 'profiles_update_own'], 'exactly the expected policies');

-- Crear un usuario dispara la creación del perfil con defaults
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');

select results_eq(
  $$select timezone, primary_currency::text, usd_rate from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values ('America/Santo_Domingo'::text, 'DOP'::text, 60.0000::numeric)$$,
  'profile auto-created with defaults'
);

-- Backfill: todo usuario existente tiene perfil (la migración inserta los que faltaban)
select is(
  (select count(*) from auth.users u left join public.profiles p on p.user_id = u.id where p.user_id is null),
  0::bigint,
  'every auth.users row has a profile'
);

-- anon: sin acceso
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon cannot read profiles');

-- owner: lee y actualiza el suyo
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select count(*)::int from public.profiles$$, $$values (1)$$, 'owner sees only own profile');
select results_eq(
  $$update public.profiles set usd_rate = 61.5 where user_id = '11111111-1111-1111-1111-111111111111' returning usd_rate$$,
  $$values (61.5000::numeric)$$,
  'owner updates own usd_rate'
);
select throws_ok(
  $$update public.profiles set usd_rate = 0 where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'usd_rate must be positive'
);
select throws_ok(
  $$insert into public.profiles (user_id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501', null, 'authenticated cannot insert profiles directly'
);

-- other: no ve ni toca el perfil ajeno
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'$$, 'other user cannot see owner profile');
select is_empty($$update public.profiles set usd_rate = 99 where user_id = '11111111-1111-1111-1111-111111111111' returning user_id$$, 'other user updates nothing');

select * from finish();
rollback;
