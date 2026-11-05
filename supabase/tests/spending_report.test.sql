begin;
select plan(24);

-- Aísla las pruebas de cualquier tasa del BCRD que haya en la base (se revierte con la transacción).
delete from public.usd_rates;

select has_function('public', 'get_month_report', array['date'], 'get_month_report exists');
select has_function('public', 'get_largest_uncategorized', array['date', 'date'], 'get_largest_uncategorized exists');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
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
  -- 30 sep local 23:30: en UTC ya es 1 oct, pero pertenece a septiembre
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 400.00, 'DOP', 'CIERRE SEPT', '2026-09-30T23:30:00-04:00', 'email', '<k>#0', (select id from public.categories where user_id is null and name = 'Supermercado'), false, null),
  -- sin categoría, el más grande
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 900.00, 'DOP', 'FERRETERIA', '2026-10-20T12:00:00-04:00', 'email', '<j>#0', null, false, null),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bhd', 'card_purchase', 5000.00, 'DOP', 'COLMADO', '2026-10-08T12:00:00-04:00', 'email', '<z>#0', (select id from public.categories where user_id is null and name = 'Supermercado'), false, null);
-- gasto manual sin comercio
insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source, category_id) values
  ('11111111-1111-1111-1111-111111111111', 'card_purchase', 120.00, 'DOP', null, '2026-10-03T12:00:00-04:00', 'manual', (select id from public.categories where user_id is null and name = 'Supermercado'));

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select category_id, sum(amount_dop)::numeric, count(*)::integer from public.get_month_report('2026-10-01') group by category_id order by category_id$$,
  $$select category_id, total_dop, tx_count from public.get_category_spending('2026-10-01', '2026-11-01') order by category_id$$,
  'per category, the report rows add up to get_category_spending (USD converted; ignored, own transfer, reversal and other user excluded)'
);
select results_eq(
  $$select category_id, category_total from (select distinct category_id, category_total from public.get_month_report('2026-10-01')) d order by category_id$$,
  $$select category_id, total_dop from public.get_category_spending('2026-10-01', '2026-11-01') order by category_id$$,
  'category_total on every row equals the category sum'
);
select results_eq(
  $$select distinct month_total from public.get_month_report('2026-10-01')$$,
  $$select distinct period_total from public.get_category_spending('2026-10-01', '2026-11-01')$$,
  'month_total on every row equals period_total'
);
select results_eq(
  $$select distinct month_count from public.get_month_report('2026-10-01')$$,
  $$select sum(tx_count)::integer from public.get_category_spending('2026-10-01', '2026-11-01')$$,
  'month_count on every row equals the number of expenses'
);
select results_eq(
  $$select distinct month_total from public.get_month_report('2026-10-01')$$,
  $$select total_dop from public.get_spending_summary('month', '2026-10-01')$$,
  'month_total equals what "Este mes" shows (get_spending_summary)'
);
select is(
  (select count(*)::integer from public.get_month_report('2026-10-01') where merchant = 'CIERRE SEPT'),
  0,
  'the 30 sep 23:30 local expense does not appear in october'
);
select is(
  (select local_date from public.get_month_report('2026-09-01') where merchant = 'CIERRE SEPT'),
  '2026-09-30'::date,
  'the 30 sep 23:30 local expense appears in september with its local date'
);
select is(
  (select local_date from public.get_month_report('2026-10-01') where merchant = 'COLMADO B'),
  '2026-10-31'::date,
  'the 23:30 expense keeps its local date (31 oct)'
);
select is(
  (select count(*)::integer from public.get_month_report('2026-11-01')),
  0,
  'the 31 oct local expense does not leak into november'
);
select results_eq(
  $$select local_date from public.get_month_report('2026-10-01') r join public.categories c on c.id = r.category_id where c.name = 'Supermercado' order by local_date$$,
  $$values ('2026-10-03'::date), ('2026-10-05'), ('2026-10-31')$$,
  'supermercado rows come oldest first'
);
select ok(
  (select merchant is null from public.get_month_report('2026-10-01') where local_date = '2026-10-03'),
  'the manual expense comes with a null merchant'
);
select results_eq(
  $$select amount, currency::text, amount_dop from public.get_month_report('2026-10-01') where merchant = 'RESTAURANTE'$$,
  $$values (10.00::numeric, 'USD'::text, 600.00::numeric)$$,
  'a USD row keeps its amount and currency and carries amount_dop'
);
select is(
  (select count(*)::integer from public.get_month_report('2026-12-01')),
  0,
  'a month without expenses has no rows'
);
select throws_ok($$select * from public.get_month_report('2026-10-05')$$, '22023', null, 'a month that is not the first day is rejected');
select throws_ok($$select * from public.get_month_report(null)$$, '22023', null, 'a null month is rejected');
select throws_ok($$select * from public.get_largest_uncategorized('2026-01-01', null)$$, '22023', null, 'a null bound is rejected');
select throws_ok($$select * from public.get_largest_uncategorized('2026-11-01', '2026-10-01')$$, '22023', null, 'an inverted range is rejected');
select throws_ok($$select * from public.get_largest_uncategorized('2026-10-01', '2026-10-01')$$, '22023', null, 'an empty range is rejected');
select throws_ok($$select * from public.get_largest_uncategorized('2025-01-01', '2026-01-03')$$, '22023', null, 'a range over 366 days is rejected');
select results_eq(
  $$select merchant, amount_dop from public.get_largest_uncategorized('2026-01-01', '2027-01-01')$$,
  $$values ('FERRETERIA'::text, 900.00::numeric), ('SIN CATEGORIA', 250.00)$$,
  'the two largest uncategorized expenses, biggest first, other user hidden'
);

reset role;
set local role anon;
select throws_ok($$select * from public.get_month_report('2026-10-01')$$, '42501', null, 'anon cannot run get_month_report');
select throws_ok($$select * from public.get_largest_uncategorized('2026-10-01', '2026-11-01')$$, '42501', null, 'anon cannot run get_largest_uncategorized');
reset role;

select * from finish();
rollback;
