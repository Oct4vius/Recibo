-- Única regla de límites de un período de presupuesto (semana desde el lunes, mes calendario).
-- period_end es EXCLUSIVO (primer día del período siguiente). Lo usan get_spending_summary y los avisos.
create or replace function public.budget_period_bounds(p_period public.budget_period, p_ref date)
returns table (period_start date, period_end date)
language sql
immutable
strict
set search_path = ''
as $$
  select
    s::date,
    (s + case p_period when 'week' then interval '1 week' else interval '1 month' end)::date
  from (select date_trunc(p_period::text, p_ref::timestamp) as s) b;
$$;

revoke execute on function public.budget_period_bounds(public.budget_period, date) from public, anon;
grant execute on function public.budget_period_bounds(public.budget_period, date) to authenticated, service_role;

-- Mismo cuerpo y firma que antes; solo los límites salen de budget_period_bounds.
create or replace function public.get_spending_summary(p_period public.budget_period, p_ref_date date default null)
returns table (
  period_start date,
  period_end date,
  total_dop numeric,
  previous_total_dop numeric,
  tx_count integer,
  by_currency jsonb
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_ref date;
  v_start date;
  v_end date;
  v_prev_start date;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select p.timezone into v_tz from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');
  v_ref := coalesce(p_ref_date, (now() at time zone v_tz)::date);
  select b.period_start, b.period_end into v_start, v_end from public.budget_period_bounds(p_period, v_ref) b;
  select b.period_start into v_prev_start from public.budget_period_bounds(p_period, v_start - 1) b;

  return query
  with spend as (
    select
      s.currency,
      s.amount,
      s.amount_dop as dop,
      (s.occurred_at at time zone v_tz)::date as d
    from public.spending_transactions s
    where s.user_id = v_uid
      and (s.occurred_at at time zone v_tz)::date >= v_prev_start
      and (s.occurred_at at time zone v_tz)::date < v_end
  )
  select
    v_start,
    v_end,
    coalesce(sum(dop) filter (where d >= v_start), 0)::numeric,
    coalesce(sum(dop) filter (where d < v_start), 0)::numeric,
    (count(*) filter (where d >= v_start))::integer,
    coalesce(
      (select jsonb_object_agg(x.currency, x.total)
       from (select currency, sum(amount) as total from spend where d >= v_start group by currency) x),
      '{}'::jsonb
    )
  from spend;
end;
$$;
