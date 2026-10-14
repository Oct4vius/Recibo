begin;
select plan(18);

select has_function('public', 'ingest_transactions', 'ingest_transactions exists');
select has_column('public', 'transactions', 'reviewed_at', 'transactions.reviewed_at exists');
select ok(not has_function_privilege('authenticated', 'public.ingest_transactions(uuid,jsonb)', 'execute'), 'authenticated cannot ingest');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into public.linked_accounts (id, user_id, provider, email, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'active'),
         ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'outlook', 'old@outlook.example', 'revoked');
insert into public.merchant_rules (user_id, pattern, category_id)
  values ('11111111-1111-1111-1111-111111111111', 'UBER', (select id from public.categories where user_id is null and name = 'Transporte'));

-- Una fila de correo: compra o reversa BHD con la tarjeta 1234 (por defecto)
create function pg_temp.mail_row(p_id text, p_type text, p_amount numeric, p_at text, p_card text default '1234', p_merchant text default 'COMERCIO')
returns jsonb language sql as $$
  select jsonb_build_object('message_id', p_id, 'bank_code', 'bhd', 'type', p_type, 'amount', p_amount, 'currency', 'DOP',
    'merchant', case when p_type = 'card_reversal' then null else p_merchant end, 'occurred_at', p_at, 'card_last4', p_card,
    'reference', null, 'counterparty_last4', null, 'template_id', 'bhd/transactions-table')
$$;

-- Regresión (fixtures reales): compra 438.42 y reversa 434.22 en el mismo minuto NO se emparejan
select results_eq(
  $$select (r->>'inserted')::int, (r->>'paired')::int, (r->>'unmatched')::int from (select public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jsonb_build_array(pg_temp.mail_row('<m1>#0', 'card_purchase', 438.42, '2026-09-16T22:42:00-04:00'),
                        pg_temp.mail_row('<m2>#0', 'card_reversal', 434.22, '2026-09-16T22:42:00-04:00'))) r) s$$,
  $$values (2, 0, 1)$$,
  'regression: an approximate amount is never paired'
);
select is((select is_ignored from public.transactions where message_id = '<m1>#0'), false, 'the 438.42 purchase still counts');
select is((select ignored_reason::text from public.transactions where message_id = '<m2>#0'), 'unmatched_reversal', 'the 434.22 reversal waits for review');

select results_eq(
  $$select (r->>'inserted')::int, (r->>'duplicates')::int from (select public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jsonb_build_array(pg_temp.mail_row('<m1>#0', 'card_purchase', 438.42, '2026-09-16T22:42:00-04:00'),
                        pg_temp.mail_row('<m2>#0', 'card_reversal', 434.22, '2026-09-16T22:42:00-04:00'))) r) s$$,
  $$values (0, 2)$$,
  'ingesting the same rows again is idempotent'
);

-- Par exacto en el mismo lote, con la reversa primero en el arreglo: se ordena por fecha
select results_eq(
  $$select (r->>'paired')::int from (select public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jsonb_build_array(pg_temp.mail_row('<m4>#0', 'card_reversal', 500.00, '2026-09-20T10:05:00-04:00'),
                        pg_temp.mail_row('<m3>#0', 'card_purchase', 500.00, '2026-09-20T10:00:00-04:00'))) r) s$$,
  $$values (1)$$,
  'an exact reversal pairs with its purchase in the same batch'
);
select results_eq(
  $$select is_ignored, ignored_reason::text, reversed_by = (select id from public.transactions where message_id = '<m4>#0')
    from public.transactions where message_id = '<m3>#0'$$,
  $$values (true, 'reversed'::text, true)$$,
  'the paired purchase is ignored and points at the reversal'
);
select results_eq(
  $$select is_ignored, ignored_reason::text, reversed_by is null from public.transactions where message_id = '<m4>#0'$$,
  $$values (true, 'reversed'::text, true)$$,
  'the paired reversal is ignored as reversed'
);

do $$ begin perform public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  jsonb_build_array(pg_temp.mail_row('<m5>#0', 'card_purchase', 300.00, '2026-09-10T08:00:00-04:00'))); end $$;
select results_eq(
  $$select (r->>'unmatched')::int from (select public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jsonb_build_array(pg_temp.mail_row('<m6>#0', 'card_reversal', 300.00, '2026-09-13T17:00:00-04:00'))) r) s$$,
  $$values (1)$$,
  'a purchase older than 72 hours is not a candidate'
);

do $$ begin perform public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  jsonb_build_array(pg_temp.mail_row('<m7>#0', 'card_purchase', 250.00, '2026-09-21T09:00:00-04:00'))); end $$;
update public.transactions set is_ignored = true, ignored_reason = 'user' where message_id = '<m7>#0';
select results_eq(
  $$select (r->>'unmatched')::int from (select public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jsonb_build_array(pg_temp.mail_row('<m8>#0', 'card_reversal', 250.00, '2026-09-21T09:30:00-04:00'))) r) s$$,
  $$values (1)$$,
  'a purchase the user already ignored is not a candidate'
);

select results_eq(
  $$select (r->>'unmatched')::int from (select public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jsonb_build_array(pg_temp.mail_row('<m9>#0', 'card_purchase', 200.00, '2026-09-22T09:00:00-04:00', '1234'),
                        pg_temp.mail_row('<m10>#0', 'card_reversal', 200.00, '2026-09-22T09:10:00-04:00', '9999'))) r) s$$,
  $$values (1)$$,
  'a reversal on another card does not pair'
);

update public.transactions set merchant = 'EDITADO' where message_id = '<m1>#0';
do $$ begin perform public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  jsonb_build_array(pg_temp.mail_row('<m1>#0', 'card_purchase', 438.42, '2026-09-16T22:42:00-04:00'))); end $$;
select is((select merchant from public.transactions where message_id = '<m1>#0'), 'EDITADO', 'a re-ingest never overwrites a user edit');

do $$ begin perform public.ingest_transactions('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  jsonb_build_array(pg_temp.mail_row('<m11>#0', 'card_purchase', 275.72, '2026-09-23T22:42:00-04:00', '1234', 'UBER*RIDES'))); end $$;
select is(
  (select c.name from public.transactions t join public.categories c on c.id = t.category_id where t.message_id = '<m11>#0'),
  'Transporte',
  'ingested movements are categorized by the user rules'
);

select throws_ok(
  $$select public.ingest_transactions('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '[]'::jsonb)$$,
  'P0002', null, 'a revoked account cannot ingest'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$update public.transactions set reviewed_at = now() where message_id = '<m2>#0' returning reviewed_at is not null$$,
  $$values (true)$$,
  'the owner marks an unmatched reversal as reviewed'
);
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $$update public.transactions set reviewed_at = now() where message_id = '<m6>#0' returning id$$,
  'another user cannot mark it'
);

select * from finish();
rollback;
