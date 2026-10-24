begin;
select plan(5);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.categories (id, user_id, name, counts_as_spending)
  values ('cccccccc-0000-4000-8000-00000000000a', '11111111-1111-1111-1111-111111111111', 'A propia', true),
         ('cccccccc-0000-4000-8000-00000000000b', '22222222-2222-2222-2222-222222222222', 'B privada', false);
insert into public.transactions (id, user_id, source, type, amount, currency, occurred_at)
  values ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'manual', 'card_purchase', 50.00, 'DOP', now());

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- regression — category_id pointing at another user's private category
select throws_ok(
  $$update public.transactions set category_id = 'cccccccc-0000-4000-8000-00000000000b'
    where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null,
  'regression — a user cannot assign another user''s private category to a transaction'
);
select throws_ok(
  $$insert into public.transactions (user_id, source, type, amount, currency, occurred_at, category_id)
    values ('11111111-1111-1111-1111-111111111111', 'manual', 'card_purchase', 5.00, 'DOP', now(),
            'cccccccc-0000-4000-8000-00000000000b')$$,
  '42501', null,
  'regression — a manual expense cannot use another user''s private category'
);
select lives_ok(
  $$update public.transactions set category_id = 'cccccccc-0000-4000-8000-00000000000a'
    where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'an own category can be assigned'
);
select lives_ok(
  $$update public.transactions set category_id = (select id from public.categories where user_id is null limit 1)
    where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'a default category can be assigned'
);
select lives_ok(
  $$update public.transactions set category_id = null, merchant = 'X' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'clearing the category still works'
);

select * from finish();
rollback;
