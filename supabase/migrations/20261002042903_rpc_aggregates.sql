-- Qué cuenta como gasto y su conversión a DOP (una sola definición, reutilizada por ambas RPC).
-- amount_dop convierte con la tasa del perfil; una moneda nueva queda en NULL hasta que se
-- agregue su rama explícita (no se convierte en silencio a la tasa de USD).
create or replace view public.spending_transactions
with (security_invoker = true)
as
select
  t.user_id,
  t.amount,
  t.currency,
  case t.currency
    when 'DOP' then t.amount
    when 'USD' then round(t.amount * p.usd_rate, 2)
  end as amount_dop,
  t.occurred_at
from public.transactions t
join public.profiles p on p.user_id = t.user_id
left join public.categories c on c.id = t.category_id
where t.is_ignored = false
  and t.type in ('card_purchase', 'atm_withdrawal', 'transfer_out')
  and coalesce(c.counts_as_spending, true);

-- Resumen del período actual vs anterior, en la zona horaria del perfil.
-- period_end es EXCLUSIVO (primer día del período siguiente).
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
  v_unit interval;
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
  v_unit := case p_period when 'week' then interval '1 week' else interval '1 month' end;
  v_start := date_trunc(p_period::text, v_ref::timestamp)::date;
  v_end := (v_start + v_unit)::date;
  v_prev_start := (v_start - v_unit)::date;

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

-- Historial por semana/mes/año entre dos fechas, con buckets vacíos en cero.
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
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_granularity not in ('week', 'month', 'year') then
    raise exception 'granularity must be week, month or year' using errcode = '22023';
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

revoke execute on function public.get_spending_summary(public.budget_period, date) from anon;
revoke execute on function public.get_history(text, date, date) from anon;
