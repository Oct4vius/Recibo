-- Gasto por categoría en Historial. spending_transactions gana category_id (al final, mismas columnas que antes)
-- para que el desglose use la misma definición de "qué cuenta como gasto" y no la repita en la app ni en la RPC.
-- get_category_spending agrupa por categoría en un rango de fechas locales (hasta exclusivo; null/null = todo);
-- get_spending_overall da primera fecha, total y cantidad de todos los gastos. Ambas usan la zona del perfil.

create or replace view public.spending_transactions
with (security_invoker = true)
as
select
  w.user_id,
  w.amount,
  w.currency,
  w.amount_dop,
  w.occurred_at,
  w.category_id
from public.transactions_with_rate w
left join public.categories c on c.id = w.category_id
where w.is_ignored = false
  and w.type in ('card_purchase', 'atm_withdrawal', 'transfer_out')
  and coalesce(c.counts_as_spending, true);

create or replace function public.get_category_spending(p_from date, p_to date)
returns table (category_id uuid, category_name text, total_dop numeric, tx_count integer)
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
  if (p_from is null) <> (p_to is null) or p_from >= p_to then
    raise exception 'invalid category range' using errcode = '22023';
  end if;

  select p.timezone into v_tz from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');

  return query
  select
    s.category_id,
    c.name,
    sum(s.amount_dop)::numeric,
    count(*)::integer
  from public.spending_transactions s
  left join public.categories c on c.id = s.category_id
  where s.user_id = v_uid
    and (p_from is null
         or ((s.occurred_at at time zone v_tz)::date >= p_from
             and (s.occurred_at at time zone v_tz)::date < p_to))
  group by s.category_id, c.name;
end;
$$;

create or replace function public.get_spending_overall()
returns table (first_date date, total_dop numeric, tx_count integer)
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

  select p.timezone into v_tz from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');

  -- Un agregado sin group by siempre devuelve una fila: sin gastos es (null, 0, 0).
  return query
  select
    min((s.occurred_at at time zone v_tz)::date),
    coalesce(sum(s.amount_dop), 0)::numeric,
    count(*)::integer
  from public.spending_transactions s
  where s.user_id = v_uid;
end;
$$;

revoke execute on function public.get_category_spending(date, date) from public, anon;
grant execute on function public.get_category_spending(date, date) to authenticated;
revoke execute on function public.get_spending_overall() from public, anon;
grant execute on function public.get_spending_overall() to authenticated;
