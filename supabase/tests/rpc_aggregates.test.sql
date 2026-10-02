begin;
select plan(18);

select has_function('public', 'get_spending_summary', array['public.budget_period', 'date'], 'get_spending_summary exists');
select has_function('public', 'get_history', array['text', 'date', 'date'], 'get_history exists');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
update public.profiles set usd_rate = 60 where user_id = '11111111-1111-1111-1111-111111111111';
insert into public.linked_accounts (id, user_id, provider, email)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');

-- Semana de referencia: lunes 2026-09-14 .. domingo 2026-09-20 (hora dominicana)
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, category_id, is_ignored, ignored_reason) values
  -- cuenta: 275.72 DOP, miércoles 16
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 275.72, 'DOP', 'UBER*RIDES', '2026-09-16T22:42:00-04:00', 'email', '<a>#0', null, false, null),
  -- cuenta: 12 USD → 720 DOP, jueves 17
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 12.00, 'USD', 'NETFLIX', '2026-09-17T09:00:00-04:00', 'email', '<b>#0', null, false, null),
  -- NO cuenta: ignorada
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 999.00, 'DOP', 'IGNORADA', '2026-09-17T10:00:00-04:00', 'email', '<c>#0', null, true, 'user'),
  -- NO cuenta: reversa
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_reversal', 434.22, 'DOP', null, '2026-09-16T21:31:00-04:00', 'email', '<d>#0', null, true, 'unmatched_reversal'),
  -- NO cuenta: transferencia propia (categoría counts_as_spending = false)
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'transfer_out', 3500.00, 'DOP', 'JUAN PEREZ', '2026-09-16T09:53:00-04:00', 'email', '<e>#0', (select id from public.categories where user_id is null and name = 'Transferencias propias'), false, null),
  -- cuenta en la semana ANTERIOR: 100 DOP, jueves 10
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'atm_withdrawal', 100.00, 'DOP', null, '2026-09-10T12:00:00-04:00', 'email', '<f>#0', null, false, null),
  -- cuenta como DOMINGO 20 en hora dominicana aunque en UTC ya es lunes 21 (00:30Z = 20:30 -04:00)
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 50.00, 'DOP', 'TZ EDGE', '2026-09-21T00:30:00Z', 'email', '<g>#0', null, false, null);

-- Fix round 1: filas extra en usuarios/fechas separados; no tocan los expected de arriba.
-- Usuario 1, diciembre 2026 / enero 2027 (frontera de año, hora dominicana)
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, category_id, is_ignored, ignored_reason) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 200.00, 'DOP', 'DIC', '2026-12-15T12:00:00-04:00', 'email', '<h>#0', null, false, null),
  -- 2027-01-01T02:00Z = 31 dic 2026 22:00 en RD: cuenta como DICIEMBRE
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 70.00, 'DOP', 'DIC EDGE', '2027-01-01T02:00:00Z', 'email', '<i>#0', null, false, null),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 30.00, 'DOP', 'ENE', '2027-01-10T12:00:00-04:00', 'email', '<j>#0', null, false, null);

-- Usuario 3: perfil en Tokyo (UTC+9)
insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'tokyo@example.com');
update public.profiles set timezone = 'Asia/Tokyo' where user_id = '33333333-3333-3333-3333-333333333333';
insert into public.linked_accounts (id, user_id, provider, email)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'outlook', 'tokyo@outlook.com');
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, category_id, is_ignored, ignored_reason) values
  -- 2026-09-20T16:00Z = lunes 21 sep 01:00 en Tokyo (domingo 20 12:00 en RD)
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'bhd', 'card_purchase', 10.00, 'DOP', 'TOKYO SEMANA', '2026-09-20T16:00:00Z', 'email', '<t1>#0', null, false, null),
  -- 2026-09-30T16:00Z = jueves 1 oct 01:00 en Tokyo (30 sep 12:00 en RD)
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'bhd', 'card_purchase', 5.00, 'DOP', 'TOKYO MES', '2026-09-30T16:00:00Z', 'email', '<t2>#0', null, false, null);

-- Usuario 4: tasa fraccionaria 58.731 (usd_rate es numeric(10,4))
insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444', 'rate@example.com');
update public.profiles set usd_rate = 58.731 where user_id = '44444444-4444-4444-4444-444444444444';
insert into public.linked_accounts (id, user_id, provider, email)
  values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'outlook', 'rate@outlook.com');
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, category_id, is_ignored, ignored_reason) values
  ('44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bhd', 'card_purchase', 10.01, 'USD', 'RATE A', '2026-09-16T12:00:00-04:00', 'email', '<r1>#0', null, false, null),
  ('44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bhd', 'card_purchase', 3.33, 'USD', 'RATE B', '2026-09-17T12:00:00-04:00', 'email', '<r2>#0', null, false, null);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select period_start, period_end, total_dop, previous_total_dop, tx_count from public.get_spending_summary('week', '2026-09-17')$$,
  $$values ('2026-09-14'::date, '2026-09-21'::date, 1045.72::numeric, 100.00::numeric, 3)$$,
  'weekly summary: 275.72 + 720 + 50, previous week 100, 3 transactions'
);
select results_eq(
  $$select by_currency from public.get_spending_summary('week', '2026-09-17')$$,
  $$values ('{"DOP": 325.72, "USD": 12.00}'::jsonb)$$,
  'by_currency keeps original currencies'
);
select results_eq(
  $$select period_start, period_end, total_dop, previous_total_dop from public.get_spending_summary('month', '2026-09-17')$$,
  $$values ('2026-09-01'::date, '2026-10-01'::date, 1145.72::numeric, 0::numeric)$$,
  'monthly summary includes previous-week row, previous month empty'
);
select results_eq(
  $$select bucket_start, total_dop, tx_count from public.get_history('week', '2026-09-01', '2026-09-20') order by bucket_start$$,
  $$values ('2026-08-31'::date, 0::numeric, 0), ('2026-09-07'::date, 100.00::numeric, 1), ('2026-09-14'::date, 1045.72::numeric, 3)$$,
  'weekly history includes empty buckets and starts on Monday'
);
select results_eq(
  $$select bucket_start, total_dop from public.get_history('month', '2026-08-01', '2026-09-30') order by bucket_start$$,
  $$values ('2026-08-01'::date, 0::numeric), ('2026-09-01'::date, 1145.72::numeric)$$,
  'monthly history'
);
select throws_ok($$select * from public.get_history('day', '2026-09-01', '2026-09-30')$$, '22023', null, 'invalid granularity rejected');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select total_dop, tx_count from public.get_spending_summary('week', '2026-09-17')$$,
  $$values (0::numeric, 0)$$,
  'other user sees zero (RLS applies inside security invoker)'
);

-- Fix round 1 ---------------------------------------------------------------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
-- 1. Historial anual: 2025 vacío, 2026 = 1145.72 (sep) + 200 + 70 (31 dic 22:00 RD) = 1415.72 en 6 tx (4 sep + 2 dic), 2027 = 30
select results_eq(
  $$select bucket_start, total_dop, tx_count from public.get_history('year', '2025-06-01', '2027-03-01') order by bucket_start$$,
  $$values ('2025-01-01'::date, 0::numeric, 0), ('2026-01-01'::date, 1415.72::numeric, 6), ('2027-01-01'::date, 30.00::numeric, 1)$$,
  'yearly history: empty 2025 bucket, 2026 includes the Dec 31 22:00 DR row, 2027'
);

-- 2. Sin p_ref_date: el período contiene "hoy" en la zona del perfil
select results_eq(
  $$select period_start <= (now() at time zone 'America/Santo_Domingo')::date
       and (now() at time zone 'America/Santo_Domingo')::date < period_end
       and period_end - period_start = 7
       and extract(isodow from period_start) = 1
     from public.get_spending_summary('week')$$,
  $$values (true)$$,
  'null ref date: week contains today, spans 7 days and starts on Monday'
);
select results_eq(
  $$select period_start <= (now() at time zone 'America/Santo_Domingo')::date
       and (now() at time zone 'America/Santo_Domingo')::date < period_end
       and extract(day from period_start) = 1
       and period_end = (period_start + interval '1 month')::date
     from public.get_spending_summary('month')$$,
  $$values (true)$$,
  'null ref date: month contains today and runs first-of-month to first-of-next'
);

-- 3. Diciembre -> enero: previous = dic 200 + 70 = 270, actual = ene 30
select results_eq(
  $$select period_start, period_end, total_dop, previous_total_dop, tx_count from public.get_spending_summary('month', '2027-01-15')$$,
  $$values ('2027-01-01'::date, '2027-02-01'::date, 30.00::numeric, 270.00::numeric, 1)$$,
  'month summary across the year boundary: previous period is December 2026'
);

-- 4. Zona horaria no predeterminada (Tokyo)
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select results_eq(
  $$select period_start, period_end, total_dop, previous_total_dop, tx_count from public.get_spending_summary('week', '2026-09-21')$$,
  $$values ('2026-09-21'::date, '2026-09-28'::date, 10.00::numeric, 0::numeric, 1)$$,
  'Tokyo profile: 2026-09-20T16:00Z lands in the week starting Monday 21 (it would be Sunday 20 in Santo Domingo)'
);
select results_eq(
  $$select period_start, total_dop, previous_total_dop, tx_count from public.get_spending_summary('month', '2026-10-01')$$,
  $$values ('2026-10-01'::date, 5.00::numeric, 10.00::numeric, 1)$$,
  'Tokyo profile: 2026-09-30T16:00Z lands in October (it would be September in Santo Domingo)'
);

-- 5. Redondeo USD con tasa fraccionaria: 10.01*58.731=587.89731->587.90, 3.33*58.731=195.57423->195.57
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select results_eq(
  $$select total_dop, by_currency from public.get_spending_summary('week', '2026-09-17')$$,
  $$values (783.47::numeric, '{"USD": 13.34}'::jsonb)$$,
  'USD rounding with usd_rate 58.731: 587.90 + 195.57, native USD total kept in by_currency'
);

-- 6. Sin autenticar (auth.uid() nulo)
set local request.jwt.claim.sub = '';
select throws_ok($$select * from public.get_spending_summary('week', '2026-09-17')$$, '42501', null, 'get_spending_summary rejects unauthenticated calls');
select throws_ok($$select * from public.get_history('week', '2026-09-01', '2026-09-20')$$, '42501', null, 'get_history rejects unauthenticated calls');

select * from finish();
rollback;
