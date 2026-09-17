begin;
select plan(8);

select has_table('public', 'linked_accounts', 'linked_accounts exists');
select is((select relrowsecurity from pg_class where oid = 'public.linked_accounts'::regclass), true, 'RLS on linked_accounts');
select policies_are('public', 'linked_accounts', array['linked_accounts_select_own'], 'user can only read');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
-- El sync (service role, aquí postgres) crea la cuenta
insert into public.linked_accounts (user_id, provider, email)
  values ('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');

select throws_ok(
  $$insert into public.linked_accounts (user_id, provider, email) values ('11111111-1111-1111-1111-111111111111', 'outlook', 'OWNER@outlook.com')$$,
  '23505', null, 'same provider+email unique per user (case-insensitive)'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select email from public.linked_accounts$$, $$values ('owner@outlook.com'::text)$$, 'owner reads own account');
select throws_ok(
  $$insert into public.linked_accounts (user_id, provider, email) values ('11111111-1111-1111-1111-111111111111', 'gmail', 'x@gmail.com')$$,
  '42501', null, 'user cannot insert accounts (Edge Function does)'
);
select is_empty($$update public.linked_accounts set status = 'revoked' returning id$$, 'user cannot update accounts');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.linked_accounts$$, 'other sees nothing');

select * from finish();
rollback;
