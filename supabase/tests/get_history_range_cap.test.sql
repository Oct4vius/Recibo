begin;
select plan(6);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- regression — get_history accepted any range, so one call could build millions of buckets on the shared database
select throws_ok(
  $$select * from public.get_history('week', '2000-01-03', '2026-01-05')$$,
  '22023', null,
  'regression — a weekly range of more than 520 buckets is rejected'
);
select throws_ok(
  $$select * from public.get_history('year', '4713-01-01 BC', '294000-01-01')$$,
  '22023', null,
  'regression — an extreme yearly range is rejected'
);
select throws_ok(
  $$select * from public.get_history('month', '2026-10-01', '2026-01-01')$$,
  '22023', null,
  'an inverted range is rejected'
);
select throws_ok(
  $$select * from public.get_history('month', null, '2026-01-01')$$,
  '22023', null,
  'a null bound is rejected'
);
select is(
  (select count(*)::int from public.get_history('month', '1990-01-01', '2033-04-01')),
  520,
  'exactly 520 monthly buckets is still allowed'
);
select throws_ok(
  $$select * from public.get_history('month', '1990-01-01', '2033-05-01')$$,
  '22023', null,
  '521 monthly buckets is rejected'
);

select * from finish();
rollback;
