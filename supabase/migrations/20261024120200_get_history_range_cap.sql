-- get_history acotado en el servidor: rechaza rangos nulos, invertidos o de más de 520 períodos (la app pide 8, 6 o 3).
-- Antes el tamaño lo decidía el cliente: una sola llamada podía generar millones de buckets en la base compartida.
create or replace function public.get_history(p_granularity text, p_from date, p_to date)
returns table (bucket_start date, total_dop numeric, tx_count integer)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_step interval;
  v_buckets bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_granularity not in ('week', 'month', 'year') then
    raise exception 'granularity must be week, month or year' using errcode = '22023';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid history range' using errcode = '22023';
  end if;

  v_buckets := case p_granularity
    when 'week' then (date_trunc('week', p_to::timestamp)::date - date_trunc('week', p_from::timestamp)::date) / 7 + 1
    when 'month' then (extract(year from p_to) - extract(year from p_from)) * 12
                      + extract(month from p_to) - extract(month from p_from) + 1
    else extract(year from p_to) - extract(year from p_from) + 1
  end;
  if v_buckets > 520 then
    raise exception 'history range too large' using errcode = '22023';
  end if;

  select p.timezone into v_tz from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');
  v_step := case p_granularity when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '1 year' end;

  return query
  with buckets as (
    select g::date as b
    from generate_series(
      date_trunc(p_granularity, p_from::timestamp),
      date_trunc(p_granularity, p_to::timestamp),
      v_step
    ) g
  ),
  spend as (
    select
      date_trunc(p_granularity, (s.occurred_at at time zone v_tz))::date as b,
      s.amount_dop as dop
    from public.spending_transactions s
    where s.user_id = v_uid
      and (s.occurred_at at time zone v_tz)::date >= date_trunc(p_granularity, p_from::timestamp)::date
      and (s.occurred_at at time zone v_tz)::date < (date_trunc(p_granularity, p_to::timestamp) + v_step)::date
  )
  select
    buckets.b,
    coalesce(sum(spend.dop), 0)::numeric,
    count(spend.dop)::integer
  from buckets
  left join spend on spend.b = buckets.b
  group by buckets.b
  order by buckets.b;
end;
$$;

revoke execute on function public.get_history(text, date, date) from public, anon;
grant execute on function public.get_history(text, date, date) to authenticated;
