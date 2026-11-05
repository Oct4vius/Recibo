-- Reportes imprimibles del escritorio. spending_transactions gana id y merchant (al final, mismas columnas y filtro que
-- antes) para que la lista del reporte use la misma definición de "qué cuenta como gasto" y no la repita en la app.
-- get_month_report devuelve cada gasto del mes local con los subtotales por categoría y el total del mes calculados con
-- ventanas en la MISMA consulta que las filas: un solo snapshot, así la hoja nunca muestra un subtotal distinto de sus
-- filas. get_largest_uncategorized devuelve los dos gastos sin categoría más grandes de un rango de fechas locales
-- (hasta exclusivo). Ambas usan la zona del perfil y son de solo lectura.

create or replace view public.spending_transactions
with (security_invoker = true)
as
select
  w.user_id,
  w.amount,
  w.currency,
  w.amount_dop,
  w.occurred_at,
  w.category_id,
  w.id,
  w.merchant
from public.transactions_with_rate w
left join public.categories c on c.id = w.category_id
where w.is_ignored = false
  and w.type in ('card_purchase', 'atm_withdrawal', 'transfer_out')
  and coalesce(c.counts_as_spending, true);

create or replace function public.get_month_report(p_month date)
returns table (
  tx_id uuid,
  local_date date,
  merchant text,
  category_id uuid,
  category_name text,
  amount numeric,
  currency public.currency_code,
  amount_dop numeric,
  category_total numeric,
  category_count integer,
  month_total numeric,
  month_count integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_month is null or p_month <> date_trunc('month', p_month)::date then
    raise exception 'invalid report month' using errcode = '22023';
  end if;

  select p.timezone into v_tz from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');

  return query
  select
    s.id,
    (s.occurred_at at time zone v_tz)::date,
    s.merchant,
    s.category_id,
    c.name,
    s.amount,
    s.currency,
    s.amount_dop,
    (sum(s.amount_dop) over (partition by s.category_id))::numeric,
    (count(*) over (partition by s.category_id))::integer,
    (sum(s.amount_dop) over ())::numeric,
    (count(*) over ())::integer
  from public.spending_transactions s
  left join public.categories c on c.id = s.category_id
  where s.user_id = v_uid
    and (s.occurred_at at time zone v_tz)::date >= p_month
    and (s.occurred_at at time zone v_tz)::date < (p_month + interval '1 month')::date
  order by s.occurred_at, s.id;
end;
$$;

create or replace function public.get_largest_uncategorized(p_from date, p_to date)
returns table (
  tx_id uuid,
  local_date date,
  merchant text,
  amount numeric,
  currency public.currency_code,
  amount_dop numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > 366 then
    raise exception 'invalid uncategorized range' using errcode = '22023';
  end if;

  select p.timezone into v_tz from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');

  return query
  select
    s.id,
    (s.occurred_at at time zone v_tz)::date,
    s.merchant,
    s.amount,
    s.currency,
    s.amount_dop
  from public.spending_transactions s
  where s.user_id = v_uid
    and s.category_id is null
    and (s.occurred_at at time zone v_tz)::date >= p_from
    and (s.occurred_at at time zone v_tz)::date < p_to
  order by s.amount_dop desc, s.occurred_at, s.id
  limit 2;
end;
$$;

revoke execute on function public.get_month_report(date) from public, anon;
grant execute on function public.get_month_report(date) to authenticated;
revoke execute on function public.get_largest_uncategorized(date, date) from public, anon;
grant execute on function public.get_largest_uncategorized(date, date) to authenticated;
