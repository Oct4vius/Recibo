-- Las columnas de identidad de una transacción no cambian nunca (ni el usuario ni el sync).
-- Sin esto, un usuario podría pasar source a 'manual' y borrar un gasto importado por correo.
create or replace function public.transactions_forbid_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.source is distinct from old.source
    or new.message_id is distinct from old.message_id
    or new.linked_account_id is distinct from old.linked_account_id
    or new.bank_code is distinct from old.bank_code
    or new.template_id is distinct from old.template_id
  then
    raise exception 'transactions identity columns are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger transactions_forbid_identity_change
  before update on public.transactions
  for each row execute function public.transactions_forbid_identity_change();
