begin;
select plan(11);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'u1@example.com');
insert into public.linked_accounts (id, user_id, provider, email)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'u1@outlook.com');
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 900.00, 'DOP', 'T1', now(), 'email', '<t1>#0');

create temp table wk as
  select period_start from public.budget_period_bounds('week', (now() at time zone 'America/Santo_Domingo')::date);
grant select on wk to authenticated;

select ok(not has_function_privilege('authenticated', 'public.budgets_reset_alerts()', 'execute'), 'the trigger function is not callable');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.budgets (user_id, period, limit_amount) values ('11111111-1111-1111-1111-111111111111', 'week', 1000);
select results_eq(
  $$select threshold from public.budget_alerts where budget_id = (select id from public.budgets where period = 'week') and period_start = (select period_start from wk) order by 1$$,
  $$values (80)$$, 'a new budget already past 80 % is claimed silently');
select is_empty($$select * from public.claim_budget_alerts()$$, 'so it does not alert');

reset role;
insert into public.budget_alerts (budget_id, user_id, period_start, threshold)
  select b.id, b.user_id, (select period_start from wk) - 7, t from public.budgets b, unnest(array[80, 100]) t;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

update public.budgets set limit_amount = 2000 where period = 'week';
select is_empty(
  $$select threshold from public.budget_alerts where budget_id = (select id from public.budgets where period = 'week') and period_start = (select period_start from wk)$$,
  'raising the limit clears this period''s claims');
select is(
  (select count(*)::int from public.budget_alerts where period_start = (select period_start from wk) - 7), 2,
  'earlier periods keep their claims');

reset role;
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 700.00, 'DOP', 'T2', now(), 'email', '<t2>#0');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select period::text, threshold from public.claim_budget_alerts()$$, $$values ('week', 80)$$,
  'after raising the limit, crossing 80 % alerts again');

create temp table kept as
  select id from public.budget_alerts where period_start = (select period_start from wk);
insert into public.budgets (user_id, period, limit_amount, is_active)
  values ('11111111-1111-1111-1111-111111111111', 'week', 2000, true)
  on conflict (user_id, period) do update set limit_amount = excluded.limit_amount, is_active = excluded.is_active;
select results_eq(
  $$select id from public.budget_alerts where period_start = (select period_start from wk)$$,
  $$select id from kept$$, 'saving the same amount keeps the claims');

update public.budgets set limit_amount = 1500 where period = 'week';
select results_eq(
  $$select threshold from public.budget_alerts where period_start = (select period_start from wk) order by 1$$,
  $$values (80), (100)$$, 'lowering the limit below the spending claims silently (rows)');
select is_empty($$select * from public.claim_budget_alerts()$$, 'lowering the limit below the spending claims silently (no alert)');

update public.budgets set is_active = false where period = 'week';
update public.budgets set is_active = true where period = 'week';
select results_eq(
  $$select threshold from public.budget_alerts where period_start = (select period_start from wk) order by 1$$,
  $$values (80), (100)$$, 'reactivating a budget claims silently (rows)');
select is_empty($$select * from public.claim_budget_alerts()$$, 'reactivating a budget claims silently (no alert)');

reset role;
select * from finish();
rollback;
