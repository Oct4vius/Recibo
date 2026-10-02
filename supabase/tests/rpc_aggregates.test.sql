begin;
select plan(9);

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

select * from finish();
rollback;
