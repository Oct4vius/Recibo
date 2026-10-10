-- Reglas de categoría (4b-2). Una sola definición de "qué regla aplica" (match_category), usada por el
-- trigger de insert (gastos manuales y, desde el Plan 3, los del banco) y por save_merchant_rule.

-- Un patrón por usuario y campo, sin importar mayúsculas: "Siempre poner…" actualiza en vez de duplicar.
create unique index merchant_rules_user_field_pattern_key
  on public.merchant_rules (user_id, match_field, lower(pattern));

-- Categoría de la primera regla del usuario que coincide. strpos (no ILIKE): un % o _ del patrón es literal.
-- Gana la de menor priority y, entre iguales, el patrón más largo (el más específico).
create or replace function public.match_category(p_user_id uuid, p_merchant text, p_counterparty_last4 text)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select r.category_id
  from public.merchant_rules r
  where r.user_id = p_user_id
    and (
      (r.match_field = 'merchant' and p_merchant is not null and strpos(lower(p_merchant), lower(r.pattern)) > 0)
      or (r.match_field = 'counterparty_last4' and r.pattern = p_counterparty_last4)
    )
  order by r.priority asc, length(r.pattern) desc, r.created_at asc
  limit 1
$$;

revoke execute on function public.match_category(uuid, text, text) from public, anon;
-- El trigger corre con los permisos de quien inserta: la app (authenticated) y el sync (service_role).
grant execute on function public.match_category(uuid, text, text) to authenticated, service_role;

-- Solo al insertar y solo si no viene categoría: nunca pisa una elegida por el usuario.
create or replace function public.transactions_assign_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is null then
    new.category_id := public.match_category(new.user_id, new.merchant, new.counterparty_last4);
  end if;
  return new;
end;
$$;

create trigger transactions_assign_category
  before insert on public.transactions
  for each row execute function public.transactions_assign_category();

revoke execute on function public.transactions_assign_category() from public, anon, authenticated;

-- Crea o actualiza una regla y la aplica a los movimientos sin categoría, en una transacción.
-- RPC y no upsert de PostgREST: el índice único es de expresión (lower(pattern)).
create or replace function public.save_merchant_rule(
  p_match_field text,
  p_pattern text,
  p_category_id uuid,
  p_rule_id uuid default null
)
returns table (rule_id uuid, applied_count integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rule_id uuid;
  v_applied integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_rule_id is not null then
    update public.merchant_rules r
      set match_field = p_match_field, pattern = trim(p_pattern), category_id = p_category_id
      where r.id = p_rule_id and r.user_id = v_uid
      returning r.id into v_rule_id;
    if v_rule_id is null then
      raise exception 'rule not found' using errcode = 'P0002';
    end if;
  else
    insert into public.merchant_rules as r (user_id, match_field, pattern, category_id)
      values (v_uid, p_match_field, trim(p_pattern), p_category_id)
      on conflict (user_id, match_field, lower(pattern)) do update set category_id = excluded.category_id
      returning r.id into v_rule_id;
  end if;

  with candidates as (
    select t.id, public.match_category(v_uid, t.merchant, t.counterparty_last4) as category_id
    from public.transactions t
    where t.user_id = v_uid and t.category_id is null
  )
  update public.transactions t
    set category_id = c.category_id
    from candidates c
    where c.id = t.id and c.category_id = p_category_id;
  get diagnostics v_applied = row_count;

  return query select v_rule_id, v_applied;
end;
$$;

revoke execute on function public.save_merchant_rule(text, text, uuid, uuid) from public, anon;
grant execute on function public.save_merchant_rule(text, text, uuid, uuid) to authenticated;
