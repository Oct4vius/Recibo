begin;
select plan(25);

select has_table('public', 'budgets', 'budgets exists');
select has_table('public', 'budget_alerts', 'budget_alerts exists');
select has_table('public', 'push_tokens', 'push_tokens exists');
select has_table('public', 'sync_logs', 'sync_logs exists');
select has_table('public', 'unparsed_emails', 'unparsed_emails exists');
select is(
  (select bool_and(relrowsecurity) from pg_class where oid in ('public.budgets'::regclass, 'public.budget_alerts'::regclass, 'public.push_tokens'::regclass, 'public.sync_logs'::regclass, 'public.unparsed_emails'::regclass)),
  true, 'RLS on all five tables'
);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into public.linked_accounts (id, user_id, provider, email)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');
insert into public.unparsed_emails (user_id, linked_account_id, bank_code, message_id, subject, snippet, received_at)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', '<u1>', 'Estado de cuenta', 'Tu estado...', now());

-- Filas sembradas por el service role (aquí postgres) para los asserts de aislamiento
insert into public.budgets (id, user_id, period, limit_amount)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'week', 10000);
insert into public.budget_alerts (budget_id, user_id, period_start, threshold)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2026-09-14', 80);
insert into public.sync_logs (user_id, linked_account_id, fetched, parsed, unparsed)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, 2, 1);
select throws_ok(
  $$insert into public.budget_alerts (budget_id, user_id, period_start, threshold) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2026-09-14', 80)$$,
  '23505', null, 'one alert per budget, period and threshold'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$insert into public.budgets (user_id, period, limit_amount) values ('11111111-1111-1111-1111-111111111111', 'month', 40000) returning thresholds$$,
  $$values (array[80, 100])$$,
  'owner creates monthly budget with default thresholds'
);
select throws_ok(
  $$insert into public.budgets (user_id, period, limit_amount) values ('11111111-1111-1111-1111-111111111111', 'month', 1)$$,
  '23505', null, 'one budget per period per user'
);
select results_eq(
  $$insert into public.push_tokens (user_id, expo_token) values ('11111111-1111-1111-1111-111111111111', 'ExponentPushToken[abc]') returning platform$$,
  $$values ('android'::text)$$,
  'owner registers push token'
);
select results_eq($$select subject from public.unparsed_emails$$, $$values ('Estado de cuenta'::text)$$, 'owner reads unparsed emails');
select results_eq(
  $$update public.unparsed_emails set resolved = true returning resolved$$,
  $$values (true)$$,
  'owner marks unparsed email resolved'
);
select throws_ok(
  $$insert into public.sync_logs (user_id, linked_account_id, fetched, parsed, unparsed) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 1, 0)$$,
  '42501', null, 'user cannot write sync_logs'
);

select throws_ok(
  $$update public.unparsed_emails set subject = 'x'$$,
  '42501', null, 'owner cannot update columns other than resolved'
);
select lives_ok($$update public.unparsed_emails set resolved = true$$, 'owner can update resolved');
select results_eq($$select resolved from public.unparsed_emails$$, $$values (true)$$, 'resolved persisted');
select throws_ok(
  $$insert into public.budget_alerts (budget_id, user_id, period_start, threshold) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '2026-09-21', 100)$$,
  '42501', null, 'user cannot write budget_alerts'
);
select throws_ok(
  $$insert into public.budgets (user_id, period, limit_amount) values ('22222222-2222-2222-2222-222222222222', 'month', 100)$$,
  '42501', null, 'user cannot create a budget for another user'
);
select throws_ok(
  $$insert into public.budgets (user_id, period, limit_amount, currency) values ('11111111-1111-1111-1111-111111111111', 'week', 100, 'USD')$$,
  '23514', null, 'budgets are in DOP only'
);
select throws_ok(
  $$insert into public.budgets (user_id, period, limit_amount) values ('11111111-1111-1111-1111-111111111111', 'week', 0)$$,
  '23514', null, 'budget limit must be positive'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.budgets$$, 'other sees no budgets');
select is_empty($$select * from public.unparsed_emails$$, 'other sees no unparsed emails');

select is_empty($$select * from public.push_tokens$$, 'other sees no push tokens');
select is_empty($$select * from public.sync_logs$$, 'other sees no sync logs');
select is_empty($$select * from public.budget_alerts$$, 'other sees no budget alerts');

select * from finish();
rollback;
