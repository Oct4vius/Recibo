begin;
select plan(3);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
insert into public.usd_rates (rate_date, sell, source) values ('2026-08-03', 59.0000, 'bcrd');

-- regression — one user's backdated USD expense dragged the global BCRD window back to 1899, which includes a
-- known unreadable row (2020-09-29) and stopped the rate feed for every user
insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source, is_ignored, ignored_reason)
  values ('11111111-1111-1111-1111-111111111111', 'card_purchase', 1.00, 'USD', 'BACKDATED', '1900-01-01T12:00:00-04:00',
          'manual', true, 'user');
select results_eq(
  $$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2025-09-01'::date, '2026-10-15'::date)$$,
  'regression — the backfill never starts before 13 months before the current month'
);
select ok(
  (select from_date > '2020-09-29' from public.usd_rates_fetch_window('2026-10-15')),
  'regression — the window cannot reach the unreadable 2020-09-29 BCRD row'
);

delete from public.transactions;
insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source)
  values ('11111111-1111-1111-1111-111111111111', 'card_purchase', 1.00, 'USD', 'RECENT', '2026-05-10T12:00:00-04:00', 'manual');
select results_eq(
  $$select from_date, to_date from public.usd_rates_fetch_window('2026-10-15')$$,
  $$values ('2026-04-01'::date, '2026-10-15'::date)$$,
  'a USD spend inside the floor still reopens the backfill from the month before it'
);

select * from finish();
rollback;
