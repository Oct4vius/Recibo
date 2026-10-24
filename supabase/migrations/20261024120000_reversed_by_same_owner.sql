-- reversed_by solo puede enlazar movimientos del mismo usuario.
-- 1) Un trigger impide que un usuario apunte reversed_by (por PostgREST) a un movimiento de otro: la FK solo pide que
--    el id exista y la policy de update solo mira la fila propia.
-- 2) ingest_transactions busca "reversa ya emparejada" solo entre los movimientos del dueño de la cuenta: corre como
--    service_role (sin RLS) y antes una fila ajena que apuntara a la reversa bloqueaba el emparejamiento.
create or replace function public.transactions_reversed_by_same_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reversed_by is not null and not exists (
    select 1 from public.transactions r where r.id = new.reversed_by and r.user_id = new.user_id
  ) then
    raise exception 'reversed_by must reference a transaction of the same user' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.transactions_reversed_by_same_owner() from public, anon, authenticated;

create trigger transactions_reversed_by_same_owner
  before insert or update of reversed_by on public.transactions
  for each row execute function public.transactions_reversed_by_same_owner();

create or replace function public.ingest_transactions(p_account_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid;
  r record;
  v_id uuid;
  v_purchase uuid;
  v_reversal uuid;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_paired integer := 0;
  v_unmatched integer := 0;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('ingest:' || p_account_id::text, 0)) then
    return jsonb_build_object('status', 'skipped');
  end if;

  select a.user_id into v_user from public.linked_accounts a where a.id = p_account_id and a.status = 'active';
  if v_user is null then
    raise exception 'account not active' using errcode = 'P0002';
  end if;

  for r in
    select *
    from jsonb_to_recordset(p_rows) as x(
      message_id text, bank_code public.bank_code, type public.tx_type, amount numeric(14,2), currency public.currency_code,
      merchant text, occurred_at timestamptz, card_last4 text, reference text, counterparty_last4 text, template_id text
    )
    order by x.occurred_at, (x.type = 'card_reversal'), x.message_id
  loop
    v_id := null;
    insert into public.transactions as t (
      user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source,
      message_id, card_last4, reference, counterparty_last4, template_id, is_ignored, ignored_reason
    )
    values (
      v_user, p_account_id, r.bank_code, r.type, r.amount, r.currency, r.merchant, r.occurred_at, 'email',
      r.message_id, r.card_last4, r.reference, r.counterparty_last4, r.template_id,
      r.type = 'card_reversal',
      case when r.type = 'card_reversal' then 'unmatched_reversal'::public.ignored_reason end
    )
    on conflict (linked_account_id, message_id) do nothing
    returning t.id into v_id;

    if v_id is null then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;
    v_inserted := v_inserted + 1;

    if r.type = 'card_reversal' then
      v_purchase := null;
      select t.id into v_purchase
      from public.transactions t
      where t.user_id = v_user
        and t.type = 'card_purchase'
        and t.is_ignored = false
        and t.bank_code = r.bank_code
        and t.card_last4 = r.card_last4
        and t.currency = r.currency
        and t.amount = r.amount
        and t.occurred_at <= r.occurred_at
        and t.occurred_at >= r.occurred_at - interval '72 hours'
      order by t.occurred_at desc, t.id desc
      limit 1
      for update;

      if v_purchase is not null then
        update public.transactions set ignored_reason = 'reversed' where id = v_id;
        update public.transactions set is_ignored = true, ignored_reason = 'reversed', reversed_by = v_id where id = v_purchase;
        v_paired := v_paired + 1;
      else
        v_unmatched := v_unmatched + 1;
      end if;
    elsif r.type = 'card_purchase' then
      -- Dirección inversa: la reversa pudo entrar en una página anterior. Se busca una reversa sin emparejar de la
      -- misma tarjeta, monto EXACTO, en las 72 h siguientes a la compra.
      v_reversal := null;
      select t.id into v_reversal
      from public.transactions t
      where t.user_id = v_user
        and t.type = 'card_reversal'
        and t.ignored_reason = 'unmatched_reversal'
        and t.bank_code = r.bank_code
        and t.card_last4 = r.card_last4
        and t.currency = r.currency
        and t.amount = r.amount
        and t.occurred_at >= r.occurred_at
        and t.occurred_at <= r.occurred_at + interval '72 hours'
        and not exists (select 1 from public.transactions p where p.user_id = v_user and p.reversed_by = t.id)
      order by t.occurred_at asc, t.id asc
      limit 1
      for update;

      if v_reversal is not null then
        update public.transactions set ignored_reason = 'reversed' where id = v_reversal;
        update public.transactions set is_ignored = true, ignored_reason = 'reversed', reversed_by = v_reversal where id = v_id;
        v_paired := v_paired + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'status', 'ok', 'inserted', v_inserted, 'duplicates', v_duplicates, 'paired', v_paired, 'unmatched', v_unmatched
  );
end;
$$;

revoke execute on function public.ingest_transactions(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_transactions(uuid, jsonb) to service_role;
