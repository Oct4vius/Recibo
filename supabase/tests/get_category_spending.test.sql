begin;
select plan(15);

-- Aísla las pruebas de cualquier tasa del BCRD que haya en la base (se revierte con la transacción).
delete from public.usd_rates;

select has_function('public', 'get_category_spending', array['date', 'date'], 'get_category_spending exists');
select has_function('public', 'get_spending_overall', 'get_spending_overall exists');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'empty@example.com');
update public.profiles set usd_rate = 60 where user_id = '11111111-1111-1111-1111-111111111111';
insert into public.linked_accounts (id, user_id, provider, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'outlook', 'other@outlook.com');

insert into public.categories (id, user_id, name)
  values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Mascotas');

insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, category_id, is_ignored, ignored_reason) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 1000.00, 'DOP', 'COLMADO A', '2026-10-05T12:00:00-04:00', 'email', '<a>#0', (select id from public.categories where user_id is null and name = 'Supermercado'), false, null),
  -- 31 oct local aunque en UTC ya es 1 nov
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 500.00, 'DOP', 'COLMADO B', '2026-10-31T23:30:00-04:00', 'email', '<b>#0', (select id from public.categories where user_id is null and name = 'Supermercado'), false, null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 10.00, 'USD', 'RESTAURANTE', '2026-10-10T12:00:00-04:00', 'email', '<c>#0', (select id from public.categories where user_id is null and name = 'Comida'), false, null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 250.00, 'DOP', 'SIN CATEGORIA', '2026-10-12T12:00:00-04:00', 'email', '<d>#0', null, false, null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 300.00, 'DOP', 'VETERINARIA', '2026-10-15T12:00:00-04:00', 'email', '<e>#0', 'cccccccc-0000-0000-0000-000000000001', false, null),
  -- NO cuenta: ignorada
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 999.00, 'DOP', 'IGNORADA', '2026-10-17T10:00:00-04:00', 'email', '<f>#0', (select id from public.categories where user_id is null and name = 'Supermercado'), true, 'user'),
  -- NO cuenta: transferencia propia
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'transfer_out', 3500.00, 'DOP', 'JUAN PEREZ', '2026-10-18T09:53:00-04:00', 'email', '<g>#0', (select id from public.categories where user_id is null and name = 'Transferencias propias'), false, null),
  -- NO cuenta: reversa sin compra
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_reversal', 434.22, 'DOP', null, '2026-10-19T21:31:00-04:00', 'email', '<h>#0', null, true, 'unmatched_reversal'),
  -- septiembre
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 700.00, 'DOP', 'RESTAURANTE', '2026-09-20T12:00:00-04:00', 'email', '<i>#0', (select id from public.categories where user_id is null and name = 'Comida'), false, null),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bhd', 'card_purchase', 5000.00, 'DOP', 'COLMADO', '2026-10-08T12:00:00-04:00', 'email', '<z>#0', (select id from public.categories where user_id is null and name = 'Supermercado'), false, null);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select category_name, total_dop, tx_count from public.get_category_spending('2026-10-01', '2026-11-01') order by total_dop desc$$,
  $$values ('Supermercado'::text, 1500.00::numeric, 2), ('Comida', 600.00, 1), ('Mascotas', 300.00, 1), (null, 250.00, 1)$$,
  'october by category: local month bounds, USD converted, ignored/reversal/own transfers excluded, other user hidden'
);
select is(
  (select sum(total_dop) from public.get_category_spending('2026-10-01', '2026-11-01')),
  (select total_dop from public.get_history('month', '2026-10-01', '2026-10-01')),
  'the breakdown adds up to the get_history total of the same month'
);
select results_eq(
  $$select category_name, total_dop, tx_count from public.get_category_spending(null, null) order by total_dop desc$$,
  $$values ('Supermercado'::text, 1500.00::numeric, 2), ('Comida', 1300.00, 2), ('Mascotas', 300.00, 1), (null, 250.00, 1)$$,
  'null/null is all time'
);
select results_eq(
  $$select first_date, total_dop, tx_count from public.get_spending_overall()$$,
  $$values ('2026-09-20'::date, 3350.00::numeric, 6)$$,
  'overall: first local spending date, total and count'
);
select throws_ok($$select * from public.get_category_spending('2026-10-01', null)$$, '22023', null, 'one null bound is rejected');
select throws_ok($$select * from public.get_category_spending('2026-11-01', '2026-10-01')$$, '22023', null, 'an inverted range is rejected');
select throws_ok($$select * from public.get_category_spending('2026-10-01', '2026-10-01')$$, '22023', null, 'an empty range is rejected');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select category_name, total_dop, tx_count from public.get_category_spending('2026-10-01', '2026-11-01')$$,
  $$values ('Supermercado'::text, 5000.00::numeric, 1)$$,
  'another user only sees their own spending'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select results_eq(
  $$select first_date, total_dop, tx_count from public.get_spending_overall()$$,
  $$values (null::date, 0::numeric, 0)$$,
  'a user without spending gets one empty row'
);

set local request.jwt.claim.sub = '';
select throws_ok($$select * from public.get_category_spending('2026-10-01', '2026-11-01')$$, '42501', null, 'get_category_spending requires a session');
select throws_ok($$select * from public.get_spending_overall()$$, '42501', null, 'get_spending_overall requires a session');

reset role;
select ok(not has_function_privilege('anon', 'public.get_category_spending(date, date)', 'execute'), 'anon cannot run get_category_spending');
select ok(not has_function_privilege('anon', 'public.get_spending_overall()', 'execute'), 'anon cannot run get_spending_overall');

select * from finish();
rollback;
