create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- null para gastos manuales
  linked_account_id uuid references public.linked_accounts (id) on delete set null,
  bank_code public.bank_code,
  type public.tx_type not null,
  -- Siempre positivo; el signo lo da type (card_reversal resta)
  amount numeric(14,2) not null check (amount > 0),
  currency public.currency_code not null,
  merchant text,
  occurred_at timestamptz not null,
  category_id uuid references public.categories (id) on delete set null,
  source public.tx_source not null default 'email',
  is_ignored boolean not null default false,
  ignored_reason public.ignored_reason,
  -- Compra anulada por esta reversa (sync la enlaza)
  reversed_by uuid references public.transactions (id) on delete set null,
  -- '<providerMessageId>#<rowIndex>'; clave de idempotencia junto con linked_account_id
  message_id text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  reference text,
  counterparty_last4 text check (counterparty_last4 is null or counterparty_last4 ~ '^[0-9]{4}$'),
  template_id text,
  raw_snippet text check (raw_snippet is null or length(raw_snippet) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint transactions_source_shape check (
    (source = 'email' and message_id is not null and linked_account_id is not null and bank_code is not null)
    or (source = 'manual' and message_id is null)
  ),
  constraint transactions_ignored_reason_shape check (
    (is_ignored = false and ignored_reason is null) or (is_ignored = true and ignored_reason is not null)
  )
);

create unique index transactions_account_message_key
  on public.transactions (linked_account_id, message_id)
  where message_id is not null;

create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc);
create index transactions_user_active_idx on public.transactions (user_id, occurred_at desc) where is_ignored = false;
create index transactions_reversal_match_idx on public.transactions (user_id, bank_code, card_last4, currency, amount, occurred_at)
  where type = 'card_purchase' and is_ignored = false;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;

create policy transactions_select_own on public.transactions
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- El usuario solo crea gastos manuales; los de correo los inserta el sync (service role)
create policy transactions_insert_manual_own on public.transactions
  for insert to authenticated
  with check ((select auth.uid()) = user_id and source = 'manual');

create policy transactions_update_own on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Los de correo no se borran: se ignoran (trazabilidad)
create policy transactions_delete_manual_own on public.transactions
  for delete to authenticated
  using ((select auth.uid()) = user_id and source = 'manual');
