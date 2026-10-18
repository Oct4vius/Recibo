-- Avisos de presupuesto locales: el servidor decide qué umbral se cruzó y lo RECLAMA en budget_alerts; la app
-- solo muestra lo que esta llamada reclamó. Las funciones *_at reciben usuario y fecha (pgTAP con fechas fijas);
-- las públicas actúan solo sobre auth.uid().

-- Avance de cada presupuesto activo del usuario en su período actual (misma fuente que los totales de la app:
-- spending_transactions.amount_dop, fechas en la zona del perfil).
create or replace function public.budget_progress(p_user uuid, p_today date default null)
returns table (budget_id uuid, period public.budget_period, period_start date, limit_amount numeric, spent_dop numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    b.id,
    b.period,
    bd.period_start,
    b.limit_amount,
    coalesce((
      select sum(s.amount_dop)
      from public.spending_transactions s
      where s.user_id = p_user
        and (s.occurred_at at time zone z.tz)::date >= bd.period_start
        and (s.occurred_at at time zone z.tz)::date < bd.period_end
    ), 0)::numeric
  from public.budgets b
  left join public.profiles p on p.user_id = b.user_id
  cross join lateral (select coalesce(p.timezone, 'America/Santo_Domingo') as tz) z
  cross join lateral (select coalesce(p_today, (now() at time zone z.tz)::date) as today) t
  cross join lateral public.budget_period_bounds(b.period, t.today) bd
  where b.user_id = p_user
    and b.is_active;
$$;

-- Umbrales cruzados por presupuesto. El arreglo [80, 100] es el espejo del CHECK de profiles.alert_thresholds
-- y aparece solo aquí. Comparación en numeric, sin redondeos: spent * 100 >= limit * threshold.
create or replace function public.crossed_budget_thresholds(p_user uuid, p_today date default null)
returns table (budget_id uuid, period public.budget_period, period_start date, threshold integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select bp.budget_id, bp.period, bp.period_start, t.threshold
  from public.budget_progress(p_user, p_today) bp
  cross join unnest(array[80, 100]) as t(threshold)
  where bp.spent_dop * 100 >= bp.limit_amount * t.threshold;
$$;

-- Reclama los umbrales cruzados. Por presupuesto: m = el umbral cruzado más alto que está encendido en el perfil;
-- se reclaman todos los cruzados <= m (reclamar 100 también reclama 80) y se devuelve, por presupuesto, el más alto
-- entre los que ESTA llamada insertó y están encendidos. Lo que otra llamada ya reclamó no vuelve en returning,
-- así dos teléfonos no avisan dos veces.
create or replace function public.claim_budget_alerts_at(p_user uuid, p_today date default null)
returns table (period public.budget_period, threshold integer)
language sql
volatile
security invoker
set search_path = ''
as $$
  with crossed as (
    select * from public.crossed_budget_thresholds(p_user, p_today)
  ),
  enabled as (
    select unnest(p.alert_thresholds) as threshold
    from public.profiles p
    where p.user_id = p_user
  ),
  top as (
    select c.budget_id, max(c.threshold) as m
    from crossed c
    join enabled e on e.threshold = c.threshold
    group by c.budget_id
  ),
  inserted as (
    insert into public.budget_alerts (budget_id, user_id, period_start, threshold)
    select c.budget_id, p_user, c.period_start, c.threshold
    from crossed c
    join top t on t.budget_id = c.budget_id and c.threshold <= t.m
    on conflict (budget_id, period_start, threshold) do nothing
    returning budget_id, threshold
  )
  select b.period, max(i.threshold)::integer
  from inserted i
  join enabled e on e.threshold = i.threshold
  join public.budgets b on b.id = i.budget_id
  group by b.period
  order by b.period;
$$;

-- Reclama en silencio todo lo ya cruzado (sin filtrar por alert_thresholds); con p_budget, solo ese presupuesto.
create or replace function public.silence_budget_alerts_at(p_user uuid, p_today date default null, p_budget uuid default null)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.budget_alerts (budget_id, user_id, period_start, threshold)
  select c.budget_id, p_user, c.period_start, c.threshold
  from public.crossed_budget_thresholds(p_user, p_today) c
  where p_budget is null or c.budget_id = p_budget
  on conflict (budget_id, period_start, threshold) do nothing;
$$;

-- Públicas: solo auth.uid(). security definer porque authenticated no puede escribir en budget_alerts;
-- dentro no aplica RLS, por eso cada consulta interna filtra por usuario.
create or replace function public.claim_budget_alerts()
returns table (period public.budget_period, threshold integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  return query select c.period, c.threshold from public.claim_budget_alerts_at(auth.uid()) c;
end;
$$;

create or replace function public.silence_budget_alerts()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  perform public.silence_budget_alerts_at(auth.uid());
end;
$$;

revoke execute on function public.budget_progress(uuid, date) from public, anon, authenticated;
revoke execute on function public.crossed_budget_thresholds(uuid, date) from public, anon, authenticated;
revoke execute on function public.claim_budget_alerts_at(uuid, date) from public, anon, authenticated;
revoke execute on function public.silence_budget_alerts_at(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function public.claim_budget_alerts() from public, anon;
revoke execute on function public.silence_budget_alerts() from public, anon;
grant execute on function public.claim_budget_alerts() to authenticated;
grant execute on function public.silence_budget_alerts() to authenticated;
