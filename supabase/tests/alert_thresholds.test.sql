begin;
select plan(9);

select has_column('public', 'profiles', 'alert_thresholds', 'profiles.alert_thresholds exists');
select hasnt_column('public', 'budgets', 'thresholds', 'budgets.thresholds was dropped');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');

select results_eq(
  $$select alert_thresholds from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values (array[80, 100])$$,
  'new profiles alert at 80 and 100'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$update public.profiles set alert_thresholds = array[100] where user_id = '11111111-1111-1111-1111-111111111111' returning alert_thresholds$$,
  $$values (array[100])$$,
  'owner turns off the 80% alert'
);
select results_eq(
  $$update public.profiles set alert_thresholds = '{}' where user_id = '11111111-1111-1111-1111-111111111111' returning alert_thresholds$$,
  $$values ('{}'::integer[])$$,
  'owner turns off both alerts'
);
select throws_ok(
  $$update public.profiles set alert_thresholds = array[50] where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'only 80 and 100 are allowed'
);
select throws_ok(
  $$update public.profiles set alert_thresholds = array[80, null] where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'null thresholds are rejected'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $$update public.profiles set alert_thresholds = array[80, 100] where user_id = '11111111-1111-1111-1111-111111111111' returning user_id$$,
  'other user cannot change owner alerts'
);

reset role;
select results_eq(
  $$select alert_thresholds from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values ('{}'::integer[])$$,
  'owner value persisted'
);

select * from finish();
rollback;
