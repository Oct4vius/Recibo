begin;
select plan(22);

select has_table('public', 'transactions', 'transactions exists');
select col_type_is('public', 'transactions', 'amount', 'numeric(14,2)', 'amount is numeric(14,2)');
select col_type_is('public', 'transactions', 'occurred_at', 'timestamp with time zone', 'occurred_at is timestamptz');
select is((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), true, 'RLS on transactions');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into public.linked_accounts (id, user_id, provider, email)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');

-- El sync inserta (service role = postgres aquí)
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, card_last4, template_id)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 275.72, 'DOP', 'UBER*RIDES', '2026-09-16T22:42:00-04:00', 'email', '<m1@bhd.com.do>#0', '1234', 'bhd/transactions-table');

select throws_ok(
  $$insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, occurred_at, source, message_id)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 1, 'DOP', now(), 'email', '<m1@bhd.com.do>#0')$$,
  '23505', null, 'same message_id per account is rejected (idempotency key)'
);
-- Plan 3 inserta con ON CONFLICT (linked_account_id, message_id) DO NOTHING (supabase-js upsert + ignoreDuplicates)
select lives_ok(
  $$insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, occurred_at, source, message_id)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 1, 'DOP', now(), 'email', '<m1@bhd.com.do>#0')
    on conflict (linked_account_id, message_id) do nothing$$,
  'ON CONFLICT (linked_account_id, message_id) DO NOTHING is accepted as an arbiter'
);
select is(
  (select count(*) from public.transactions where linked_account_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and message_id = '<m1@bhd.com.do>#0'),
  1::bigint,
  'the retried insert left exactly one row and did not alter the original'
);
select throws_ok(
  $$insert into public.transactions (user_id, type, amount, currency, occurred_at, source)
    values ('11111111-1111-1111-1111-111111111111', 'card_purchase', -5, 'DOP', now(), 'manual')$$,
  '23514', null, 'amount must be positive'
);
select throws_ok(
  $$insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, occurred_at, source)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 5, 'DOP', now(), 'email')$$,
  '23514', null, 'email transactions require message_id'
);
select throws_ok(
  $$insert into public.transactions (user_id, type, amount, currency, occurred_at, source, card_last4)
    values ('11111111-1111-1111-1111-111111111111', 'card_purchase', 5, 'DOP', now(), 'manual', '12a4')$$,
  '23514', null, 'card_last4 must be 4 digits'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select merchant from public.transactions$$, $$values ('UBER*RIDES'::text)$$, 'owner reads own transaction');
select results_eq(
  $$insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source)
    values ('11111111-1111-1111-1111-111111111111', 'card_purchase', 150, 'DOP', 'Colmado', now(), 'manual') returning source::text$$,
  $$values ('manual'::text)$$,
  'owner adds a manual expense'
);
select throws_ok(
  $$insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, occurred_at, source, message_id)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 5, 'DOP', now(), 'email', '<fake>#0')$$,
  '42501', null, 'owner cannot insert email-sourced transactions (only sync does)'
);
select results_eq(
  $$update public.transactions set is_ignored = true, ignored_reason = 'user' where message_id = '<m1@bhd.com.do>#0' returning is_ignored$$,
  $$values (true)$$,
  'owner ignores an email transaction'
);
select throws_ok(
  $$update public.transactions set source = 'manual', message_id = null where message_id = '<m1@bhd.com.do>#0'$$,
  '42501', null, 'owner cannot turn an email transaction into a manual one (identity columns are immutable)'
);
select is(
  (select source::text from public.transactions where message_id = '<m1@bhd.com.do>#0'),
  'email',
  'email transaction keeps source = email after the rejected update'
);
select is_empty(
  $$delete from public.transactions where message_id = '<m1@bhd.com.do>#0' returning id$$,
  'owner cannot delete email transactions (ignore instead)'
);
select results_eq(
  $$delete from public.transactions where source = 'manual' returning merchant$$,
  $$values ('Colmado'::text)$$,
  'owner deletes own manual transaction'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.transactions$$, 'other sees nothing');
select throws_ok(
  $$insert into public.transactions (user_id, linked_account_id, type, amount, currency, occurred_at, source)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'card_purchase', 5, 'DOP', now(), 'manual')$$,
  '23514', null, 'a manual transaction cannot reference any linked account (no FK probing of other users accounts)'
);

-- Borrar un usuario con cuenta vinculada y transacciones de correo funciona (cascadas completas; FK no action)
reset role;
select lives_ok(
  $$delete from auth.users where id = '11111111-1111-1111-1111-111111111111'$$,
  'deleting a user that owns a linked account with email transactions succeeds'
);
select is(
  (select count(*) from public.transactions where linked_account_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'the deleted user transactions are gone with the user'
);

select * from finish();
rollback;
