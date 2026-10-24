begin;
select plan(5);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'b@example.com');

create temp table acct as
  select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'gmail', 'a@gmail.example', 'rt-a') as id;
create temp table other as
  select public.link_mail_account('22222222-2222-2222-2222-222222222222', 'gmail', 'b@gmail.example', 'rt-b') as id;

select is(
  (select count(*)::int from vault.secrets where name = 'mail-token-' || (select id from acct)::text),
  1,
  'linking stores the refresh token in Vault'
);

-- regression — deleting a Recibo user (dashboard) cascaded linked_accounts but left the refresh token in Vault
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from vault.secrets where name = 'mail-token-' || (select id from acct)::text),
  0,
  'regression — deleting a user removes their mailbox refresh token from Vault'
);
select is(public.mail_account_token((select id from other)), 'rt-b', 'another user''s token is untouched');

-- deleting the account row directly (operator) also removes its secret
delete from public.linked_accounts where id = (select id from other);
select is(
  (select count(*)::int from vault.secrets where name = 'mail-token-' || (select id from other)::text),
  0,
  'deleting a linked account row removes its Vault secret'
);
select ok(
  not has_function_privilege('authenticated', 'public.linked_accounts_delete_vault_secret()', 'execute'),
  'authenticated cannot execute the trigger function'
);

select * from finish();
rollback;
