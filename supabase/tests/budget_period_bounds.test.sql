begin;
select plan(8);

select has_function('public', 'budget_period_bounds', array['public.budget_period', 'date'], 'budget_period_bounds exists');
select results_eq($$select period_start, period_end from public.budget_period_bounds('week', '2026-09-20')$$,
  $$values ('2026-09-14'::date, '2026-09-21'::date)$$, 'a Sunday belongs to the week that started on Monday');
select results_eq($$select period_start, period_end from public.budget_period_bounds('week', '2026-09-14')$$,
  $$values ('2026-09-14'::date, '2026-09-21'::date)$$, 'a Monday starts its own week');
select results_eq($$select period_start, period_end from public.budget_period_bounds('week', '2026-12-31')$$,
  $$values ('2026-12-28'::date, '2027-01-04'::date)$$, 'a week can cross the year');
select results_eq($$select period_start, period_end from public.budget_period_bounds('month', '2026-12-15')$$,
  $$values ('2026-12-01'::date, '2027-01-01'::date)$$, 'December ends on January 1st (exclusive)');
select results_eq($$select period_start, period_end from public.budget_period_bounds('month', '2028-02-29')$$,
  $$values ('2028-02-01'::date, '2028-03-01'::date)$$, 'leap February');
select ok(has_function_privilege('authenticated', 'public.budget_period_bounds(public.budget_period, date)', 'execute'), 'authenticated can compute bounds');
select ok(not has_function_privilege('anon', 'public.budget_period_bounds(public.budget_period, date)', 'execute'), 'anon cannot compute bounds');

select * from finish();
rollback;
