begin;
select plan(36);

-- Aísla las pruebas de cualquier tasa del BCRD que haya en la base (se revierte con la transacción).
delete from public.usd_rates;

-- Ayudas locales a la transacción
create function pg_temp.mk_user(n int) returns uuid language plpgsql as $$
declare
  u uuid := (repeat(n::text, 8) || '-' || repeat(n::text, 4) || '-' || repeat(n::text, 4) || '-' || repeat(n::text, 4) || '-' || repeat(n::text, 12))::uuid;
begin
  insert into auth.users (id, email) values (u, 'u' || n || '@example.com');
  insert into public.linked_accounts (user_id, provider, email) values (u, 'outlook', 'u' || n || '@outlook.com');
  return u;
end;
$$;

create function pg_temp.spend(
  u uuid, amt numeric, at timestamptz,
  cur text default 'DOP', ty text default 'card_purchase', ign text default null, cat uuid default null
) returns void language sql as $$
  insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at,
                                   source, message_id, category_id, is_ignored, ignored_reason)
  values (u, (select a.id from public.linked_accounts a where a.user_id = u), 'bhd', ty::public.tx_type, amt,
          cur::public.currency_code, 'TEST', at, 'email', gen_random_uuid()::text, cat, ign is not null,
          ign::public.ignored_reason);
$$;

select pg_temp.mk_user(1); select pg_temp.mk_user(2); select pg_temp.mk_user(3); select pg_temp.mk_user(4);
select pg_temp.mk_user(5); select pg_temp.mk_user(6); select pg_temp.mk_user(7); select pg_temp.mk_user(8);

-- Estructura y privilegios
select has_function('public', 'claim_budget_alerts', array[]::text[], 'claim_budget_alerts exists');
select has_function('public', 'silence_budget_alerts', array[]::text[], 'silence_budget_alerts exists');
select ok(has_function_privilege('authenticated', 'public.claim_budget_alerts()', 'execute'), 'authenticated can claim');
select ok(has_function_privilege('authenticated', 'public.silence_budget_alerts()', 'execute'), 'authenticated can silence');
select ok(not has_function_privilege('anon', 'public.claim_budget_alerts()', 'execute'), 'anon cannot claim');
select ok(not has_function_privilege('anon', 'public.silence_budget_alerts()', 'execute'), 'anon cannot silence');
select ok(not has_function_privilege('authenticated', 'public.claim_budget_alerts_at(uuid, date)', 'execute'), 'claim for another user is internal');
select ok(not has_function_privilege('authenticated', 'public.silence_budget_alerts_at(uuid, date, uuid)', 'execute'), 'silence for another user is internal');
select ok(not has_function_privilege('authenticated', 'public.budget_progress(uuid, date)', 'execute'), 'budget_progress is internal');
select ok(not has_function_privilege('authenticated', 'public.crossed_budget_thresholds(uuid, date)', 'execute'), 'crossed_budget_thresholds is internal');
select throws_ok($$select * from public.claim_budget_alerts()$$, '42501', null, 'claim without a session is rejected');

-- U1: semanal 1000.00, fronteras
insert into public.budgets (user_id, period, limit_amount) values ('11111111-1111-1111-1111-111111111111', 'week', 1000.00);
select pg_temp.spend('11111111-1111-1111-1111-111111111111', 799.99, '2026-09-15T12:00:00-04:00');
select pg_temp.spend('11111111-1111-1111-1111-111111111111', 5000, '2026-09-15T12:00:00-04:00', ign => 'user');
select pg_temp.spend('11111111-1111-1111-1111-111111111111', 5000, '2026-09-15T12:00:00-04:00', ty => 'transfer_out',
  cat => (select id from public.categories where user_id is null and name = 'Transferencias propias'));
select pg_temp.spend('11111111-1111-1111-1111-111111111111', 434.22, '2026-09-15T12:00:00-04:00', ty => 'card_reversal', ign => 'unmatched_reversal');
select pg_temp.spend('11111111-1111-1111-1111-111111111111', 500, '2026-09-13T23:00:00-04:00');

select is_empty($$select * from public.claim_budget_alerts_at('11111111-1111-1111-1111-111111111111', '2026-09-16')$$,
  '79.999 % claims nothing; ignored, own transfers, reversals and last Sunday do not count');

select pg_temp.spend('11111111-1111-1111-1111-111111111111', 0.01, '2026-09-14T00:30:00-04:00');
select results_eq($$select period::text, threshold from public.claim_budget_alerts_at('11111111-1111-1111-1111-111111111111', '2026-09-16')$$,
  $$values ('week', 80)$$, 'exactly 80 % claims the 80 alert');
select is_empty($$select * from public.claim_budget_alerts_at('11111111-1111-1111-1111-111111111111', '2026-09-16')$$,
  'a second call returns nothing');

select is((select spent_dop from public.budget_progress('11111111-1111-1111-1111-111111111111', '2026-09-16')), 800.00::numeric,
  'the alert uses the same total as the app (progress)');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select is((select total_dop from public.get_spending_summary('week', '2026-09-16')), 800.00::numeric,
  'the alert uses the same total as the app (summary)');
reset role;

select pg_temp.spend('11111111-1111-1111-1111-111111111111', 200.00, '2026-09-21T03:30:00Z');
select results_eq($$select period::text, threshold from public.claim_budget_alerts_at('11111111-1111-1111-1111-111111111111', '2026-09-16')$$,
  $$values ('week', 100)$$, 'a Sunday 23:30 spend in Santo Domingo counts in that week');
select is_empty($$select * from public.claim_budget_alerts_at('11111111-1111-1111-1111-111111111111', '2026-09-21')$$,
  'a new week starts without alerts');

select pg_temp.spend('11111111-1111-1111-1111-111111111111', 850.00, '2026-09-22T12:00:00-04:00');
select results_eq($$select period::text, threshold from public.claim_budget_alerts_at('11111111-1111-1111-1111-111111111111', '2026-09-22')$$,
  $$values ('week', 80)$$, 'a new week alerts again');
select results_eq($$select period_start, threshold from public.budget_alerts where user_id = '11111111-1111-1111-1111-111111111111' order by 1, 2$$,
  $$values ('2026-09-14'::date, 80), ('2026-09-14'::date, 100), ('2026-09-21'::date, 80)$$, 'claims are kept per period');

-- U2: mensual, salto 70 -> 105 %
insert into public.budgets (user_id, period, limit_amount) values ('22222222-2222-2222-2222-222222222222', 'month', 1000.00);
select pg_temp.spend('22222222-2222-2222-2222-222222222222', 700.00, '2026-09-10T12:00:00-04:00');
select pg_temp.spend('22222222-2222-2222-2222-222222222222', 350.00, '2026-10-01T03:30:00Z');
select results_eq($$select period::text, threshold from public.claim_budget_alerts_at('22222222-2222-2222-2222-222222222222', '2026-09-30')$$,
  $$values ('month', 100)$$, '70 -> 105 % returns only 100 (day 30 at 23:30 counts in September)');
select results_eq($$select threshold from public.budget_alerts where user_id = '22222222-2222-2222-2222-222222222222' order by 1$$,
  $$values (80), (100)$$, 'the 80 alert is claimed with the 100');

-- U3: solo el umbral 100 encendido
update public.profiles set alert_thresholds = '{100}' where user_id = '33333333-3333-3333-3333-333333333333';
insert into public.budgets (user_id, period, limit_amount) values ('33333333-3333-3333-3333-333333333333', 'week', 1000.00);
select pg_temp.spend('33333333-3333-3333-3333-333333333333', 850.00, '2026-09-15T12:00:00-04:00');
select is_empty($$select * from public.claim_budget_alerts_at('33333333-3333-3333-3333-333333333333', '2026-09-16')$$,
  'a threshold turned off does not alert');
select is((select count(*)::int from public.budget_alerts where user_id = '33333333-3333-3333-3333-333333333333'), 0,
  'a threshold turned off does not claim');
select pg_temp.spend('33333333-3333-3333-3333-333333333333', 200.00, '2026-09-15T12:00:00-04:00');
select results_eq($$select period::text, threshold from public.claim_budget_alerts_at('33333333-3333-3333-3333-333333333333', '2026-09-16')$$,
  $$values ('week', 100)$$, 'claiming 100 also claims 80 even when 80 is off (returns 100)');
select results_eq($$select threshold from public.budget_alerts where user_id = '33333333-3333-3333-3333-333333333333' order by 1$$,
  $$values (80), (100)$$, 'claiming 100 also claims 80 even when 80 is off (rows)');

-- U4: presupuesto inactivo
insert into public.budgets (user_id, period, limit_amount, is_active) values ('44444444-4444-4444-4444-444444444444', 'week', 1000.00, false);
select pg_temp.spend('44444444-4444-4444-4444-444444444444', 2000.00, '2026-09-15T12:00:00-04:00');
select is_empty($$select * from public.claim_budget_alerts_at('44444444-4444-4444-4444-444444444444', '2026-09-16')$$,
  'an inactive budget never claims');

-- U5: silenciar con 120 %
insert into public.budgets (user_id, period, limit_amount) values ('55555555-5555-5555-5555-555555555555', 'week', 1000.00);
select pg_temp.spend('55555555-5555-5555-5555-555555555555', 1200.00, '2026-09-15T12:00:00-04:00');
select public.silence_budget_alerts_at('55555555-5555-5555-5555-555555555555', '2026-09-16');
select is_empty($$select * from public.claim_budget_alerts_at('55555555-5555-5555-5555-555555555555', '2026-09-16')$$,
  'silencing at 120 % leaves nothing to alert');
select results_eq($$select threshold from public.budget_alerts where user_id = '55555555-5555-5555-5555-555555555555' order by 1$$,
  $$values (80), (100)$$, 'silencing claims every crossed threshold');

-- U8: USD con la tasa del BCRD (840 con BCRD, 700 con respaldo)
update public.profiles set usd_rate = 50 where user_id = '88888888-8888-8888-8888-888888888888';
insert into public.usd_rates (rate_date, sell, source) values ('2026-09-15', 60.0000, 'bcrd');
insert into public.budgets (user_id, period, limit_amount) values ('88888888-8888-8888-8888-888888888888', 'week', 1000.00);
select pg_temp.spend('88888888-8888-8888-8888-888888888888', 14.00, '2026-09-16T12:00:00-04:00', cur => 'USD');
select results_eq($$select period::text, threshold from public.claim_budget_alerts_at('88888888-8888-8888-8888-888888888888', '2026-09-16')$$,
  $$values ('week', 80)$$, 'USD spending converts with the BCRD rate');

-- Aislamiento y RPC públicas (fecha real)
insert into public.budgets (user_id, period, limit_amount) values ('66666666-6666-6666-6666-666666666666', 'week', 100.00);
insert into public.budgets (user_id, period, limit_amount) values ('77777777-7777-7777-7777-777777777777', 'week', 100.00);
select pg_temp.spend('77777777-7777-7777-7777-777777777777', 500.00, now());

set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select is_empty($$select * from public.claim_budget_alerts()$$, 'another user''s spending never claims for me');
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select results_eq($$select period::text, threshold from public.claim_budget_alerts()$$, $$values ('week', 100)$$, 'claim uses today in the profile zone');
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select is((select count(*)::int from public.budget_alerts), 0, 'a user cannot see another user''s alerts');
reset role;

select pg_temp.spend('66666666-6666-6666-6666-666666666666', 150.00, now());
set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select lives_ok($$select public.silence_budget_alerts()$$, 'silence runs for the current user');
select is_empty($$select * from public.claim_budget_alerts()$$, 'after silencing, the crossed 100 % does not alert');
reset role;
set local role anon;
select throws_ok($$select * from public.claim_budget_alerts()$$, '42501', null, 'anon cannot call claim');
reset role;

select * from finish();
rollback;
