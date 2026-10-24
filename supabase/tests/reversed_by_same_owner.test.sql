begin;
select plan(6);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.linked_accounts (id, user_id, provider, email, status)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'gmail', 'b@gmail.example', 'active');

create function pg_temp.mail_row(p_id text, p_type text, p_at text)
returns jsonb language sql as $$
  select jsonb_build_object('message_id', p_id, 'bank_code', 'bhd', 'type', p_type, 'amount', 100.00, 'currency', 'DOP',
    'merchant', case when p_type = 'card_reversal' then null else 'SHOP' end, 'occurred_at', p_at, 'card_last4', '1234',
    'reference', null, 'counterparty_last4', null, 'template_id', 'bhd/transactions-table')
$$;

-- B's reversal arrives first (unmatched); A has one manual row of their own
select public.ingest_transactions('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  jsonb_build_array(pg_temp.mail_row('mB#1', 'card_reversal', '2026-10-20T10:05:00-04:00')));
insert into public.transactions (id, user_id, source, type, amount, currency, occurred_at)
  values ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'manual', 'card_purchase', 1.00, 'DOP', '2026-10-01T12:00:00-04:00');

select set_config('test.b_reversal', (select id::text from public.transactions where message_id = 'mB#1'), true);
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- regression — reversed_by pointing at another user's transaction
select throws_ok(
  $$update public.transactions set reversed_by = current_setting('test.b_reversal')::uuid
    where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null,
  'regression — a user cannot point reversed_by at another user''s transaction'
);
select throws_ok(
  $$insert into public.transactions (user_id, source, type, amount, currency, occurred_at, reversed_by)
    values ('11111111-1111-1111-1111-111111111111', 'manual', 'card_purchase', 2.00, 'DOP', now(),
            current_setting('test.b_reversal')::uuid)$$,
  '42501', null,
  'regression — a manual insert cannot point reversed_by at another user''s transaction'
);
select lives_ok(
  $$update public.transactions set reversed_by = null where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'clearing reversed_by on an own row still works'
);

reset role;

-- regression — a foreign row that already points at B's reversal (state from before the trigger) must not block B's pairing
alter table public.transactions disable trigger transactions_reversed_by_same_owner;
update public.transactions set reversed_by = current_setting('test.b_reversal')::uuid
  where id = 'aaaaaaaa-0000-4000-8000-000000000001';
alter table public.transactions enable trigger transactions_reversed_by_same_owner;

select is(
  (select (public.ingest_transactions('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     jsonb_build_array(pg_temp.mail_row('mB#0', 'card_purchase', '2026-10-20T10:00:00-04:00'))) ->> 'paired')::int),
  1,
  'regression — another user''s reversed_by does not block the owner''s reversal pairing'
);
select is((select is_ignored from public.transactions where message_id = 'mB#0'), true, 'B''s reversed purchase stops counting');
select ok(
  not has_function_privilege('authenticated', 'public.transactions_reversed_by_same_owner()', 'execute'),
  'authenticated cannot execute the trigger function'
);

select * from finish();
rollback;
