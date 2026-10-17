begin;
select plan(9);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');

create temp table acct as
  select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-1') as id;

select ok(not has_function_privilege('authenticated', 'public.link_mail_account(uuid,public.mail_provider,text,text)', 'execute'), 'authenticated still cannot link');
select ok(has_function_privilege('service_role', 'public.link_mail_account(uuid,public.mail_provider,text,text)', 'execute'), 'service_role can link');

-- error + cursor válido: se conserva since, next y maxSeen quedan en null
update public.linked_accounts
  set status = 'error', last_error = 'x',
      sync_cursor = '{"since":"2026-09-20T04:00:00Z","next":"https://page","maxSeen":"2026-10-02T00:00:00Z"}'
  where id = (select id from acct);
select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-2');
select results_eq(
  $$select status::text, last_error is null, sync_cursor::jsonb from public.linked_accounts where id = (select id from acct)$$,
  $$values ('active'::text, true, '{"since":"2026-09-20T04:00:00Z","next":null,"maxSeen":null}'::jsonb)$$,
  'error + valid cursor: since kept, next and maxSeen cleared'
);

-- error + basura: cursor inicial
update public.linked_accounts set status = 'error', sync_cursor = 'garbage' where id = (select id from acct);
select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-3');
select is((select sync_cursor from public.linked_accounts where id = (select id from acct)),
  public.initial_sync_cursor('11111111-1111-1111-1111-111111111111'), 'error + garbage cursor: initial cursor');

-- error + JSON sin since válido
update public.linked_accounts set status = 'error', sync_cursor = '{"since":"not a date"}' where id = (select id from acct);
select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-3b');
select is((select sync_cursor from public.linked_accounts where id = (select id from acct)),
  public.initial_sync_cursor('11111111-1111-1111-1111-111111111111'), 'error + invalid since: initial cursor');

-- error + sin cursor
update public.linked_accounts set status = 'error', sync_cursor = null where id = (select id from acct);
select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-3c');
select is((select sync_cursor from public.linked_accounts where id = (select id from acct)),
  public.initial_sync_cursor('11111111-1111-1111-1111-111111111111'), 'error + missing cursor: initial cursor');

-- revocada con cursor válido: cursor inicial
update public.linked_accounts
  set status = 'revoked', sync_cursor = '{"since":"2026-09-20T04:00:00Z","next":null,"maxSeen":null}'
  where id = (select id from acct);
select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-4');
select is((select sync_cursor from public.linked_accounts where id = (select id from acct)),
  public.initial_sync_cursor('11111111-1111-1111-1111-111111111111'), 'revoked: initial cursor');

-- activa: sin cambios
update public.linked_accounts
  set status = 'active', sync_cursor = '{"since":"2026-09-20T04:00:00Z","next":"n","maxSeen":"2026-10-02T00:00:00Z"}'
  where id = (select id from acct);
select public.link_mail_account('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.example', 'rt-5');
select is((select sync_cursor::jsonb from public.linked_accounts where id = (select id from acct)),
  '{"since":"2026-09-20T04:00:00Z","next":"n","maxSeen":"2026-10-02T00:00:00Z"}'::jsonb, 'active: cursor unchanged');

select is(public.mail_account_token((select id from acct)), 'rt-5', 'the token still rotates');

select * from finish();
rollback;
