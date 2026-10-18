-- Cambiar el límite de un presupuesto reinicia sus avisos del período actual: se borran los reclamos de ese
-- período y se reclaman en silencio los umbrales que el nuevo límite ya tiene cruzados (solo avisan cruces posteriores).
-- Un presupuesto nuevo ya cruzado tampoco avisa. security definer: authenticated no puede escribir en budget_alerts.
create or replace function public.budgets_reset_alerts()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.budget_alerts a
  using public.budget_progress(new.user_id) bp
  where a.budget_id = new.id
    and bp.budget_id = new.id
    and a.period_start = bp.period_start;

  perform public.silence_budget_alerts_at(new.user_id, null, new.id);
  return null;
end;
$$;

revoke execute on function public.budgets_reset_alerts() from public, anon, authenticated;

create trigger budgets_reset_alerts_on_insert
  after insert on public.budgets
  for each row
  when (new.is_active)
  execute function public.budgets_reset_alerts();

-- "Guardar" sin cambiar el monto reescribe la fila (upsert): solo dispara si cambia el monto o se reactiva.
create trigger budgets_reset_alerts_on_change
  after update of limit_amount, is_active on public.budgets
  for each row
  when (new.is_active and (old.limit_amount is distinct from new.limit_amount or not old.is_active))
  execute function public.budgets_reset_alerts();
