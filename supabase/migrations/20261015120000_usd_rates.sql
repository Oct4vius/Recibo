-- Tasa del dólar del BCRD (Plan 3c). Tabla global de referencia (sin user_id, como las categorías por defecto):
-- la venta del mercado spot por día publicado. La conversión de un gasto en USD se decide en un solo lugar:
-- usd_rate_on() elige la tasa y transactions_with_rate es la única vista con round(amount * rate, 2).
-- Esta migración no inserta tasas: sin ninguna, todo cae al respaldo (profiles.usd_rate) y los totales no cambian.

create type public.usd_rate_origin as enum ('bcrd', 'manual');

create table public.usd_rates (
  rate_date date primary key,
  sell numeric(10,4) not null check (sell > 0),
  -- Procedencia de la fila (p. ej. 'bcrd'); no es el origin de usd_rate_on.
  source text not null,
  fetched_at timestamptz not null default now()
);

alter table public.usd_rates enable row level security;

create policy usd_rates_select_authenticated on public.usd_rates
  for select to authenticated
  using (true);

revoke all on public.usd_rates from public, anon, authenticated;
grant select on public.usd_rates to authenticated;
grant select, insert, update on public.usd_rates to service_role;

-- Tasa de venta que corresponde a un gasto: la fecha local sale de la zona del perfil; se usa la última tasa
-- publicada en o antes de esa fecha (fines de semana, feriados, hoy sin publicar) y, si no hay ninguna,
-- profiles.usd_rate. Siempre devuelve exactamente una fila (todo null si el perfil no es visible).
create or replace function public.usd_rate_on(p_user uuid, p_at timestamptz)
returns table (rate numeric, rate_date date, origin public.usd_rate_origin)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tz text;
  v_fallback numeric;
  v_day date;
begin
  select p.timezone, p.usd_rate into v_tz, v_fallback from public.profiles p where p.user_id = p_user;
  v_day := (p_at at time zone coalesce(v_tz, 'America/Santo_Domingo'))::date;

  return query
    select r.sell, r.rate_date, 'bcrd'::public.usd_rate_origin
    from public.usd_rates r
    where r.rate_date <= v_day
    order by r.rate_date desc
    limit 1;
  if found then
    return;
  end if;

  return query select v_fallback, null::date, case when v_fallback is null then null else 'manual'::public.usd_rate_origin end;
end;
$$;

-- Lista de movimientos con su equivalente en pesos. Es el ÚNICO lugar con la fórmula de conversión; el lateral se
-- salta las filas en DOP (el filtro se evalúa una vez, no llama a la función).
create view public.transactions_with_rate with (security_invoker = true) as
select
  t.*,
  r.rate as usd_rate,
  r.rate_date as usd_rate_date,
  r.origin as usd_rate_origin,
  case t.currency
    when 'DOP' then t.amount
    when 'USD' then round(t.amount * r.rate, 2)
  end as amount_dop
from public.transactions t
left join lateral (select * from public.usd_rate_on(t.user_id, t.occurred_at) where t.currency = 'USD') r on true;

-- Qué cuenta como gasto (una sola definición, reutilizada por las RPC). amount_dop sale de transactions_with_rate;
-- una moneda nueva queda en NULL hasta que se agregue su rama explícita allí.
create or replace view public.spending_transactions
with (security_invoker = true)
as
select
  w.user_id,
  w.amount,
  w.currency,
  w.amount_dop,
  w.occurred_at
from public.transactions_with_rate w
left join public.categories c on c.id = w.category_id
where w.is_ignored = false
  and w.type in ('card_purchase', 'atm_withdrawal', 'transfer_out')
  and coalesce(c.counts_as_spending, true);

-- Ventana de descarga de tasas para fetch-usd-rates. Empieza el día 1 del mes anterior al gasto en USD más viejo
-- (fecha dominicana, global); si el historial guardado ya llega ahí (con 7 días de margen para fines de semana),
-- pide desde la última tasa menos 7 días, así una racha de corridas fallidas no deja huecos.
create or replace function public.usd_rates_fetch_window(p_today date default null)
returns table (from_date date, to_date date)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'America/Santo_Domingo')::date);
  v_oldest date;
  v_start date;
  v_min date;
  v_max date;
begin
  select min((t.occurred_at at time zone 'America/Santo_Domingo')::date) into v_oldest
  from public.transactions t
  where t.currency = 'USD';
  v_start := (date_trunc('month', coalesce(v_oldest, v_today)) - interval '1 month')::date;

  select min(r.rate_date), max(r.rate_date) into v_min, v_max from public.usd_rates r;

  if v_min is null or v_min > v_start + 7 then
    return query select v_start, v_today;
  else
    return query select greatest(v_start, v_max - 7), v_today;
  end if;
end;
$$;

revoke execute on function public.usd_rate_on(uuid, timestamptz) from public, anon;
revoke execute on function public.usd_rates_fetch_window(date) from public, anon, authenticated;
grant execute on function public.usd_rate_on(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.usd_rates_fetch_window(date) to service_role;

revoke all on public.transactions_with_rate from public, anon, authenticated;
grant select on public.transactions_with_rate to authenticated, service_role;
