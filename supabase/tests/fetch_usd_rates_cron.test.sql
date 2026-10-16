begin;
select plan(6);

select has_function('public', 'invoke_fetch_usd_rates', 'invoke_fetch_usd_rates exists');
select ok(not has_function_privilege('authenticated', 'public.invoke_fetch_usd_rates()', 'execute'), 'authenticated cannot trigger the rate fetch');
select ok(not has_function_privilege('anon', 'public.invoke_fetch_usd_rates()', 'execute'), 'anon cannot trigger the rate fetch');
select results_eq(
  $$select schedule, command from cron.job where jobname = 'fetch-usd-rates'$$,
  $$values ('0 13,23 * * *'::text, 'select public.invoke_fetch_usd_rates()'::text)$$,
  'rates are fetched at 09:00 and 19:00 Santo Domingo time (the BCRD file appears around 17:50)'
);
select is(public.invoke_fetch_usd_rates(), null, 'without Vault configuration it does nothing');

do $$ begin
  perform vault.create_secret('http://127.0.0.1:54321/functions/v1/fetch-usd-rates', 'fetch_usd_rates_url');
  perform vault.create_secret('test-secret', 'fetch_usd_rates_secret');
end $$;
select isnt(public.invoke_fetch_usd_rates(), null, 'with Vault configuration it queues the request');

select * from finish();
rollback;
