begin;
select plan(23);

select has_function('public', 'match_category', array['uuid', 'text', 'text'], 'match_category exists');
select has_function('public', 'save_merchant_rule', array['text', 'text', 'uuid', 'uuid'], 'save_merchant_rule exists');
select has_trigger('public', 'transactions', 'transactions_assign_category', 'insert trigger exists');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into public.categories (id, user_id, name)
  values ('eeeeeeee-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Ajena');

-- Reglas sembradas (postgres = service role)
insert into public.merchant_rules (id, user_id, pattern, match_field, category_id) values
  ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'UBER', 'merchant',
    (select id from public.categories where user_id is null and name = 'Transporte')),
  ('dddddddd-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'UBER EATS', 'merchant',
    (select id from public.categories where user_id is null and name = 'Comida')),
  ('dddddddd-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '0099', 'counterparty_last4',
    (select id from public.categories where user_id is null and name = 'Transferencias propias')),
  ('dddddddd-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '50%', 'merchant',
    (select id from public.categories where user_id is null and name = 'Compras')),
  ('dddddddd-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'NETFLIX', 'merchant',
    (select id from public.categories where user_id is null and name = 'Entretenimiento'));

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok(
  $$insert into public.transactions (id, user_id, type, amount, currency, merchant, counterparty_last4, category_id, occurred_at, source) values
    ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', 'Uber trip', null, null, now(), 'manual'),
    ('f0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', 'UBER EATS SANTO DOMINGO', null, null, now(), 'manual'),
    ('f0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', 'Uber', null,
      (select id from public.categories where user_id is null and name = 'Salud'), now(), 'manual'),
    ('f0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', null, null, null, now(), 'manual'),
    ('f0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', 'PROMO 50% OFF', null, null, now(), 'manual'),
    ('f0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', 'PROMO 500 OFF', null, null, now(), 'manual'),
    ('f0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', 'NETFLIX.COM', null, null, now(), 'manual'),
    ('f0000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'card_purchase', 10, 'DOP', 'GOMEZ PENA', '0099', null, now(), 'manual')$$,
  'owner inserts manual expenses (the trigger runs as authenticated)'
);
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000001'), 'Transporte', 'a rule categorizes a manual expense without category');
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000002'), 'Comida', 'the longest matching pattern wins');
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000003'), 'Salud', 'an explicit category is never overwritten');
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000004'), null::text, 'a null merchant stays uncategorized');
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000005'), 'Compras', 'a % in the pattern matches literally');
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000006'), null::text, 'a % in the pattern is not a wildcard');
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000007'), null::text, 'another user''s rules never apply');
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000008'), 'Transferencias propias', 'counterparty rules match the last 4 digits');

update public.transactions set merchant = 'Uber' where id = 'f0000000-0000-0000-0000-000000000004';
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000004'), null::text, 'editing an expense does not re-apply rules');

select results_eq(
  $$select applied_count from public.save_merchant_rule('merchant', 'netflix', (select id from public.categories where user_id is null and name = 'Entretenimiento'))$$,
  $$values (1)$$,
  'save_merchant_rule applies the new rule to uncategorized movements'
);
select is((select c.name from public.transactions t left join public.categories c on c.id = t.category_id where t.id = 'f0000000-0000-0000-0000-000000000007'), 'Entretenimiento', 'the matching movement got the rule category');
select results_eq(
  $$select applied_count from public.save_merchant_rule('merchant', 'NETFLIX', (select id from public.categories where user_id is null and name = 'Salud'))$$,
  $$values (0)$$,
  'already categorized movements are neither counted nor changed'
);
select results_eq(
  $$select count(*)::int from public.merchant_rules where lower(pattern) = 'netflix'$$,
  $$values (1)$$,
  'saving the same pattern in other case updates instead of duplicating'
);
select throws_ok(
  $$select * from public.save_merchant_rule('merchant', 'x', 'eeeeeeee-0000-0000-0000-000000000001')$$,
  '42501', null, 'a rule cannot point at another user''s category'
);
select throws_ok(
  $$select * from public.save_merchant_rule('counterparty_last4', 'ABCD', (select id from public.categories where user_id is null and name = 'Transferencias propias'))$$,
  '23514', null, 'a counterparty rule needs exactly 4 digits'
);
select throws_ok(
  $$select * from public.save_merchant_rule('merchant', 'uber eats', (select id from public.categories where user_id is null and name = 'Transporte'), 'dddddddd-0000-0000-0000-000000000001')$$,
  '23505', null, 'editing a rule onto another rule''s pattern is rejected'
);
select throws_ok(
  $$insert into public.merchant_rules (user_id, pattern, match_field, category_id)
    values ('11111111-1111-1111-1111-111111111111', 'uber', 'merchant', (select id from public.categories where user_id is null and name = 'Transporte'))$$,
  '23505', null, 'patterns are unique per user and field, ignoring case'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$select * from public.save_merchant_rule('merchant', 'HACK', (select id from public.categories where user_id is null and name = 'Otros'), 'dddddddd-0000-0000-0000-000000000001')$$,
  'P0002', null, 'a user cannot edit another user''s rule'
);

set local role anon;
select throws_ok(
  $$select * from public.save_merchant_rule('merchant', 'x', null)$$,
  '42501', null, 'anon cannot save rules'
);

select * from finish();
rollback;
