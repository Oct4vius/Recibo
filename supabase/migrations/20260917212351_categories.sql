create table public.categories (
  id uuid primary key default gen_random_uuid(),
  -- null = categoría por defecto, visible para todos, editable por nadie
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  icon text,
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  -- false → no suma a totales ni presupuesto (ej. "Transferencias propias")
  counts_as_spending boolean not null default true,
  created_at timestamptz not null default now()
);

-- Único por usuario e insensible a mayúsculas; los defaults comparten el "usuario" cero.
create unique index categories_user_name_key
  on public.categories (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

alter table public.categories enable row level security;

create policy categories_select_visible on public.categories
  for select to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

create policy categories_insert_own on public.categories
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy categories_update_own on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy categories_delete_own on public.categories
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Substring case-insensitive sobre merchant/beneficiario; el sync la aplica en orden de priority asc
  pattern text not null check (length(trim(pattern)) between 1 and 80),
  category_id uuid not null references public.categories (id) on delete cascade,
  priority integer not null default 100,
  created_at timestamptz not null default now()
);

create index merchant_rules_user_priority_idx on public.merchant_rules (user_id, priority);

alter table public.merchant_rules enable row level security;

-- La regla solo puede apuntar a una categoría que el usuario ve (default o propia)
create policy merchant_rules_select_own on public.merchant_rules
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy merchant_rules_insert_own on public.merchant_rules
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.categories c
      where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid()))
    )
  );

create policy merchant_rules_update_own on public.merchant_rules
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.categories c
      where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid()))
    )
  );

create policy merchant_rules_delete_own on public.merchant_rules
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Categorías por defecto (ALCANCE 3.5). Idempotente.
insert into public.categories (user_id, name, icon, color, counts_as_spending) values
  (null, 'Comida',                 'restaurant',      '#F97316', true),
  (null, 'Supermercado',           'shopping-cart',   '#22C55E', true),
  (null, 'Transporte',             'car',             '#3B82F6', true),
  (null, 'Servicios',              'receipt',         '#6366F1', true),
  (null, 'Entretenimiento',        'film',            '#EC4899', true),
  (null, 'Salud',                  'heart',           '#EF4444', true),
  (null, 'Compras',                'shopping-bag',    '#A855F7', true),
  (null, 'Hogar',                  'home',            '#14B8A6', true),
  (null, 'Educación',              'book',            '#0EA5E9', true),
  (null, 'Retiros',                'cash',            '#84CC16', true),
  (null, 'Transferencias',         'swap-horizontal', '#F59E0B', true),
  (null, 'Transferencias propias', 'repeat',          '#9CA3AF', false),
  (null, 'Otros',                  'ellipsis',        '#6B7280', true)
on conflict do nothing;
