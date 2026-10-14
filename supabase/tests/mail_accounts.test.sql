begin;
select plan(23);

select is((select extnamespace::regnamespace::text from pg_extension where extname = 'pg_net'), 'extensions', 'pg_net lives in extensions');
select has_function('public', 'initial_sync_cursor', 'initial_sync_cursor exists');
select has_function('public', 'link_mail_account', 'link_mail_account exists');
select has_function('public', 'unlink_mail_account', 'unlink_mail_account exists');
select has_function('public', 'mail_account_token', 'mail_account_token exists');
select has_function('public', 'set_mail_account_token', 'set_mail_account_token exists');
select ok(not has_function_privilege('authenticated', 'public.link_mail_account(uuid,public.mail_provider,text,text)', 'execute'), 'authenticated cannot link accounts directly');
select ok(not has_function_privilege('authenticated', 'public.unlink_mail_account(uuid,uuid)', 'execute'), 'authenticated cannot unlink directly');
select ok(not has_function_privilege('authenticated', 'public.mail_account_token(uuid)', 'execute'), 'authenticated cannot read tokens');
select ok(not has_function_privilege('authenticated', 'public.set_mail_account_token(uuid,text)', 'execute'), 'authenticated cannot write tokens');
select ok(not has_function_privilege('anon', 'public.mail_account_token(uuid)', 'execute'), 'anon cannot read tokens');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');

create temp table acct as
  select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'Owner@Outlook.example', 'rt-1') as id;

select results_eq(
  $$select status::text, email from public.linked_accounts where id = (select id from acct)$$,
  $$values ('active'::text, 'Owner@Outlook.example'::text)$$,
  'linking creates an active account'
);
select is(public.mail_account_token((select id from acct)), 'rt-1', 'the refresh token is stored in Vault');
select is(
  (select (sync_cursor::jsonb ->> 'since')::timestamptz from public.linked_accounts where id = (select id from acct)),
  (date_trunc('month', (now() at time zone 'America/Santo_Domingo') - interval '1 month') at time zone 'America/Santo_Domingo'),
  'the initial cursor starts on day 1 of last month in the profile zone'
);
select is(
  (select sync_cursor::jsonb -> 'next' from public.linked_accounts where id = (select id from acct)),
  'null'::jsonb,
  'the initial cursor has no next link'
);

do $$ begin perform public.set_mail_account_token((select id from acct), 'rt-2'); end $$;
select is(public.mail_account_token((select id from acct)), 'rt-2', 'the token rotates in place');

update public.linked_accounts set sync_cursor = '{"since":"2026-10-01T00:00:00Z","next":null,"maxSeen":null}' where id = (select id from acct);
select is(
  public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-3'),
  (select id from acct),
  'relinking the same mailbox (any case) reuses the account'
);
select results_eq(
  $$select public.mail_account_token(id), sync_cursor::jsonb ->> 'since' from public.linked_accounts where id = (select id from acct)$$,
  $$values ('rt-3'::text, '2026-10-01T00:00:00Z'::text)$$,
  'relinking an active account rotates the token and keeps its cursor'
);

select is(public.unlink_mail_account('22222222-2222-2222-2222-222222222222', (select id from acct)), false, 'another user cannot unlink it');
create temp table old_secret as select vault_secret_id as id from public.linked_accounts where id = (select id from acct);
select is(public.unlink_mail_account('11111111-1111-1111-1111-111111111111', (select id from acct)), true, 'the owner unlinks it');
select results_eq(
  $$select status::text, vault_secret_id is null, sync_cursor is null from public.linked_accounts where id = (select id from acct)$$,
  $$values ('revoked'::text, true, true)$$,
  'an unlinked account is revoked, without secret or cursor'
);
select is((select count(*)::int from vault.secrets where id = (select id from old_secret)), 0, 'the Vault secret is deleted');
select is(
  public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-4'),
  (select id from acct),
  'relinking a revoked account reactivates it'
);

select * from finish();
rollback;
