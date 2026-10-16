begin;
select plan(38);

-- Estructura y privilegios
select has_table('public', 'usd_rates', 'usd_rates exists');
select col_type_is('public', 'usd_rates', 'sell', 'numeric(10,4)', 'sell is numeric(10,4)');
select col_is_pk('public', 'usd_rates', 'rate_date', 'one rate per day');
select ok((select relrowsecurity from pg_class where oid = 'public.usd_rates'::regclass), 'RLS is on for usd_rates');
select has_function('public', 'usd_rate_on', array['uuid', 'timestamp with time zone'], 'usd_rate_on exists');
select ok(has_function_privilege('authenticated', 'public.usd_rate_on(uuid, timestamptz)', 'execute'), 'authenticated can read rates by date');
select ok(not has_function_privilege('anon', 'public.usd_rate_on(uuid, timestamptz)', 'execute'), 'anon cannot read rates by date');
select ok(not has_function_privilege('authenticated', 'public.usd_rates_fetch_window(date)', 'execute'), 'only service_role computes the fetch window');
select ok(not has_function_privilege('anon', 'public.usd_rates_fetch_window(date)', 'execute'), 'anon cannot compute the fetch window');
select throws_ok($$insert into public.usd_rates (rate_date, sell, source) values ('2026-01-02', 0, 'bcrd')$$, '23514', null, 'sell must be positive');
-- Sin USD ni tasas: la ventana empieza el día 1 del mes anterior a hoy
select results_eq($$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2026-09-01'::date, '2026-10-15'::date)$$, 'without USD spending the window starts the month before today');

-- Datos: usuario 1 (DR, respaldo 60), usuario 2 (otro), usuario 3 (Tokyo)
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'tokyo@example.com');
update public.profiles set usd_rate = 60 where user_id = '11111111-1111-1111-1111-111111111111';
update public.profiles set timezone = 'Asia/Tokyo' where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.usd_rates (rate_date, sell, source) values
  ('2026-09-04', 59.0500, 'bcrd'),
  ('2026-09-07', 59.1200, 'bcrd'),
  ('2026-09-08', 59.3000, 'bcrd'),
  ('2026-09-11', 59.4000, 'bcrd'),
  ('2026-09-23', 59.5000, 'bcrd'),
  ('2026-09-25', 59.6000, 'bcrd');

insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source) values
  ('11111111-1111-1111-1111-111111111111', 'card_purchase', 5.00, 'USD', 'USD5', '2026-09-01T12:00:00-04:00', 'manual'),
  ('11111111-1111-1111-1111-111111111111', 'card_purchase', 15.16, 'USD', 'NETFLIX', '2026-09-07T12:00:00-04:00', 'manual'),
  ('11111111-1111-1111-1111-111111111111', 'card_purchase', 10.00, 'USD', 'USD10', '2026-09-08T12:00:00-04:00', 'manual'),
  ('11111111-1111-1111-1111-111111111111', 'card_purchase', 100.00, 'DOP', 'DOP100', '2026-09-09T12:00:00-04:00', 'manual');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-07T12:00:00-04:00')$$,
  $$values (59.1200::numeric, '2026-09-07'::date, 'bcrd'::text)$$, 'same-day rate');
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-12T12:00:00-04:00')$$,
  $$values (59.4000::numeric, '2026-09-11'::date, 'bcrd'::text)$$, 'Saturday uses Friday''s rate');
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-13T12:00:00-04:00')$$,
  $$values (59.4000::numeric, '2026-09-11'::date, 'bcrd'::text)$$, 'Sunday uses Friday''s rate');
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-24T12:00:00-04:00')$$,
  $$values (59.5000::numeric, '2026-09-23'::date, 'bcrd'::text)$$, 'holiday uses the previous rate');
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-29T10:00:00-04:00')$$,
  $$values (59.6000::numeric, '2026-09-25'::date, 'bcrd'::text)$$, 'a day not yet published uses the latest rate');
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-01T12:00:00-04:00')$$,
  $$values (60.0000::numeric, null::date, 'manual'::text)$$, 'no earlier BCRD rate falls back to profiles.usd_rate');
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-08T03:30:00Z')$$,
  $$values (59.1200::numeric, '2026-09-07'::date, 'bcrd'::text)$$, '23:30 in Santo Domingo is still the 7th although UTC is the 8th');

select results_eq(
  $$select merchant, amount_dop, usd_rate, usd_rate_date, usd_rate_origin::text from public.transactions_with_rate order by occurred_at$$,
  $$values ('USD5', 300.00::numeric, 60.0000::numeric, null::date, 'manual'::text),
           ('NETFLIX', 896.26, 59.1200, '2026-09-07', 'bcrd'),
           ('USD10', 593.00, 59.3000, '2026-09-08', 'bcrd'),
           ('DOP100', 100.00, null, null, null)$$,
  'each row exposes its DOP amount and the rate used; DOP rows have no rate');
select results_eq(
  $$select s.amount_dop from public.spending_transactions s order by s.occurred_at$$,
  $$select w.amount_dop from public.transactions_with_rate w order by w.occurred_at$$,
  'spending_transactions uses the same conversion as the list');
select results_eq($$select amount_dop from public.spending_transactions where currency = 'DOP'$$,
  $$values (100.00::numeric)$$, 'DOP spending is unchanged');
select results_eq(
  $$select total_dop, previous_total_dop, tx_count from public.get_spending_summary('week', '2026-09-09')$$,
  $$values (1589.26::numeric, 300.00::numeric, 3)$$,
  'weekly total with two BCRD rates: 896.26 + 593.00 + 100.00; previous week uses the fallback');
select results_eq($$select count(*)::int from public.usd_rates$$, $$values (6)$$, 'authenticated reads usd_rates');
select throws_ok($$insert into public.usd_rates (rate_date, sell, source) values ('2026-10-01', 61, 'x')$$, '42501', null, 'authenticated cannot insert rates');
select throws_ok($$update public.usd_rates set sell = 1$$, '42501', null, 'authenticated cannot update rates');

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('33333333-3333-3333-3333-333333333333', '2026-09-08T03:30:00Z')$$,
  $$values (59.3000::numeric, '2026-09-08'::date, 'bcrd'::text)$$, 'the profile time zone decides the date');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select 1 from public.transactions_with_rate$$, 'other users see none of the rows (RLS through the view)');
select results_eq($$select rate, rate_date, origin::text from public.usd_rate_on('11111111-1111-1111-1111-111111111111', '2026-09-01T12:00:00-04:00')$$,
  $$values (null::numeric, null::date, null::text)$$, 'regression — another user''s manual rate is never exposed');

set local role anon;
select throws_ok($$select * from public.usd_rates$$, '42501', null, 'anon cannot read rates');
select throws_ok($$select * from public.transactions_with_rate$$, '42501', null, 'anon cannot read the list view');
reset role;

set local role service_role;
select lives_ok($$insert into public.usd_rates (rate_date, sell, source) values ('2026-10-01', 61.0000, 'bcrd')$$, 'service_role inserts rates');
select lives_ok($$update public.usd_rates set sell = 61.5000 where rate_date = '2026-10-01'$$, 'service_role updates rates');
reset role;
delete from public.usd_rates where rate_date = '2026-10-01';

-- La vista no consulta tasas para filas en DOP: usd_rate_on solo se ejecuta una vez por fila en USD (3 en este momento)
set local track_functions = 'all';
do $$ begin
  perform count(*) from public.transactions_with_rate;
end $$;
select results_eq($$select calls::int from pg_stat_xact_user_functions where funcname = 'usd_rate_on'$$, $$values (3)$$,
  'regression — DOP rows never run the rate lookup');

-- Ventana de descarga (como postgres)
select results_eq($$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2026-08-01'::date, '2026-10-15'::date)$$,
  'history does not reach the start: backfill from day 1 of the month before the oldest USD spend');
insert into public.usd_rates (rate_date, sell, source) values ('2026-08-03', 59.0000, 'bcrd');
select results_eq($$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2026-09-18'::date, '2026-10-15'::date)$$,
  'history covers the start: fetch from the latest rate minus 7 days');
insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source) values
  ('11111111-1111-1111-1111-111111111111', 'card_purchase', 1.00, 'USD', 'OLD USD', '2026-05-10T12:00:00-04:00', 'manual');
select results_eq($$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2026-04-01'::date, '2026-10-15'::date)$$,
  'an older USD spend reopens the backfill');
insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source) values
  ('11111111-1111-1111-1111-111111111111', 'card_purchase', 1.00, 'DOP', 'OLD DOP', '2026-01-05T12:00:00-04:00', 'manual');
select results_eq($$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2026-04-01'::date, '2026-10-15'::date)$$,
  'DOP spending does not move the window');
-- Hueco: la última tasa guardada quedó antes del inicio de la ventana
delete from public.usd_rates;
delete from public.transactions where currency = 'USD';
insert into public.usd_rates (rate_date, sell, source) values ('2026-06-26', 58.0000, 'bcrd');
select results_eq($$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2026-06-19'::date, '2026-10-15'::date)$$,
  'regression — the window starts at the last stored rate minus 7 days even when that is before the month start');

select * from finish();
rollback;
