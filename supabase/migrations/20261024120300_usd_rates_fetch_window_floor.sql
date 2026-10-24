-- La ventana de descarga del BCRD tiene piso: nunca empieza antes del día 1 del mes 13 meses antes del actual.
-- Antes salía del gasto en USD más viejo de TODOS los usuarios, que cualquiera controla con un gasto manual con fecha
-- vieja: la ventana llegaba a filas históricas ilegibles del BCRD (2020-09-29) y la descarga fallaba para todos.
-- Un gasto en USD más viejo que el piso usa la última tasa guardada anterior o la tasa de respaldo (usd_rate_on).
create or replace function public.usd_rates_fetch_window(p_today date default null)
returns table (from_date date, to_date date)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'America/Santo_Domingo')::date);
  v_floor date := (date_trunc('month', v_today) - interval '13 months')::date;
  v_oldest date;
  v_start date;
  v_min date;
  v_max date;
begin
  select min((t.occurred_at at time zone 'America/Santo_Domingo')::date) into v_oldest
  from public.transactions t
  where t.currency = 'USD';
  v_start := greatest((date_trunc('month', coalesce(v_oldest, v_today)) - interval '1 month')::date, v_floor);

  select min(r.rate_date), max(r.rate_date) into v_min, v_max from public.usd_rates r;

  if v_min is null or v_min > v_start + 7 then
    return query select v_start, v_today;
  else
    -- Sin greatest(): si la última tasa quedó antes del inicio, el rango arranca ahí y no queda hueco permanente.
    return query select v_max - 7, v_today;
  end if;
end;
$$;

revoke execute on function public.usd_rates_fetch_window(date) from public, anon, authenticated;
grant execute on function public.usd_rates_fetch_window(date) to service_role;
