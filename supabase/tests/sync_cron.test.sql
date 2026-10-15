begin;
select plan(6);

select has_function('public', 'invoke_sync_mail', 'invoke_sync_mail exists');
select ok(not has_function_privilege('authenticated', 'public.invoke_sync_mail()', 'execute'), 'authenticated cannot trigger the sync');
select ok(not has_function_privilege('anon', 'public.invoke_sync_mail()', 'execute'), 'anon cannot trigger the sync');
select results_eq(
  $$select schedule, command from cron.job where jobname = 'sync-mail'$$,
  $$values ('*/15 * * * *'::text, 'select public.invoke_sync_mail()'::text)$$,
  'the sync runs every 15 minutes'
);
select is(public.invoke_sync_mail(), null, 'without Vault configuration it does nothing');

do $$ begin
  perform vault.create_secret('http://127.0.0.1:54321/functions/v1/sync-mail', 'sync_mail_url');
  perform vault.create_secret('test-secret', 'sync_mail_secret');
end $$;
select isnt(public.invoke_sync_mail(), null, 'with Vault configuration it queues the request');

select * from finish();
rollback;
