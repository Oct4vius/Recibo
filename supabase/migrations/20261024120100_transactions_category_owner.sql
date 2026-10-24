-- category_id solo puede ser una categoría por defecto o del propio usuario (la misma regla que merchant_rules).
-- Antes era solo una FK: un usuario podía apuntar su movimiento a la categoría privada de otro, y el camino de avisos
-- (security definer, sin RLS) leía el counts_as_spending ajeno, distinto del total que muestra la app.
drop policy transactions_insert_manual_own on public.transactions;
create policy transactions_insert_manual_own on public.transactions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and source = 'manual'
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid()))
    ))
  );

drop policy transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid()))
    ))
  );
