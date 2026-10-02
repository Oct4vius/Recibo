begin;
select plan(16);

select has_table('public', 'categories', 'categories exists');
select has_table('public', 'merchant_rules', 'merchant_rules exists');
select is((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), true, 'RLS on categories');
select is((select relrowsecurity from pg_class where oid = 'public.merchant_rules'::regclass), true, 'RLS on merchant_rules');

-- Defaults sembrados por la migración
select results_eq(
  $$select count(*)::int from public.categories where user_id is null$$,
  $$values (13)$$,
  '13 default categories'
);
select results_eq(
  $$select counts_as_spending from public.categories where user_id is null and name = 'Transferencias propias'$$,
  $$values (false)$$,
  'Transferencias propias does not count as spending'
);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq($$select count(*)::int from public.categories$$, $$values (13)$$, 'owner sees defaults');
select results_eq(
  $$insert into public.categories (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Mascotas') returning name$$,
  $$values ('Mascotas'::text)$$,
  'owner creates own category'
);
select throws_ok(
  $$insert into public.categories (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'mascotas')$$,
  '23505', null, 'category names unique per user (case-insensitive)'
);
select is_empty(
  $$update public.categories set name = 'Hackeada' where user_id is null returning id$$,
  'owner cannot edit default categories'
);
select results_eq(
  $$insert into public.merchant_rules (user_id, pattern, category_id, priority)
    values ('11111111-1111-1111-1111-111111111111', 'UBER', (select id from public.categories where user_id is null and name = 'Transporte'), 10)
    returning pattern$$,
  $$values ('UBER'::text)$$,
  'owner creates rule pointing at a default category'
);
select results_eq(
  $$insert into public.merchant_rules (user_id, pattern, match_field, category_id)
    values ('11111111-1111-1111-1111-111111111111', '0099', 'counterparty_last4', (select id from public.categories where user_id is null and name = 'Transferencias propias'))
    returning match_field$$,
  $$values ('counterparty_last4'::text)$$,
  'owner creates a counterparty_last4 rule (own-transfer routing)'
);
select throws_ok(
  $$insert into public.merchant_rules (user_id, pattern, match_field, category_id)
    values ('11111111-1111-1111-1111-111111111111', 'GOMEZ', 'counterparty_last4', (select id from public.categories where user_id is null and name = 'Transferencias propias'))$$,
  '23514', null, 'a counterparty_last4 rule needs exactly 4 digits'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq($$select count(*)::int from public.categories$$, $$values (13)$$, 'other sees only defaults, not owner category');
select is_empty($$select * from public.merchant_rules$$, 'other sees no rules of owner');
select throws_ok(
  $$insert into public.merchant_rules (user_id, pattern, category_id)
    values ('22222222-2222-2222-2222-222222222222', 'X', (select id from public.categories where name = 'Mascotas' limit 1))$$,
  '42501', null, 'other cannot point a rule at owner private category'
);

select * from finish();
rollback;
