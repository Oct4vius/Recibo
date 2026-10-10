begin;
select plan(5);

select has_trigger('public', 'profiles', 'profiles_validate_timezone', 'time zone validation trigger exists');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');

select is(
  (select timezone from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'America/Santo_Domingo',
  'new profiles keep the default zone'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$update public.profiles set timezone = 'America/New_York' where user_id = '11111111-1111-1111-1111-111111111111' returning timezone$$,
  $$values ('America/New_York'::text)$$,
  'accepts a real IANA zone'
);
select throws_ok(
  $$update public.profiles set timezone = 'Mars/Olympus' where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '22023', null, 'rejects an unknown zone'
);
select throws_ok(
  $$update public.profiles set timezone = '' where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '22023', null, 'rejects an empty zone'
);

select * from finish();
rollback;
