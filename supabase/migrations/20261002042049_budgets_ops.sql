-- Presupuesto por período. Alertas al 80 y 100 % por defecto.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period public.budget_period not null,
  limit_amount numeric(14,2) not null check (limit_amount > 0),
  currency public.currency_code not null default 'DOP',
  thresholds integer[] not null default array[80, 100],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
alter table public.budgets enable row level security;
create policy budgets_select_own on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy budgets_insert_own on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy budgets_update_own on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy budgets_delete_own on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);

-- Registro de alertas enviadas: evita re-notificar el mismo (presupuesto, período, umbral)
create table public.budget_alerts (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  threshold integer not null,
  sent_at timestamptz not null default now(),
  unique (budget_id, period_start, threshold)
);
alter table public.budget_alerts enable row level security;
create policy budget_alerts_select_own on public.budget_alerts for select to authenticated using ((select auth.uid()) = user_id);

-- Tokens de Expo Push por dispositivo
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_token text not null unique,
  platform text not null default 'android' check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);
create trigger push_tokens_set_updated_at before update on public.push_tokens for each row execute function public.set_updated_at();
alter table public.push_tokens enable row level security;
create policy push_tokens_select_own on public.push_tokens for select to authenticated using ((select auth.uid()) = user_id);
create policy push_tokens_insert_own on public.push_tokens for insert to authenticated with check ((select auth.uid()) = user_id);
create policy push_tokens_update_own on public.push_tokens for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy push_tokens_delete_own on public.push_tokens for delete to authenticated using ((select auth.uid()) = user_id);

-- Una fila por corrida de sync por cuenta (lo escribe el service role)
create table public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  linked_account_id uuid not null references public.linked_accounts (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched integer not null default 0,
  parsed integer not null default 0,
  unparsed integer not null default 0,
  error text
);
create index sync_logs_account_started_idx on public.sync_logs (linked_account_id, started_at desc);
alter table public.sync_logs enable row level security;
create policy sync_logs_select_own on public.sync_logs for select to authenticated using ((select auth.uid()) = user_id);

-- Correos de bancos conocidos/candidatos sin plantilla: la muestra para escribir el parser
create table public.unparsed_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  linked_account_id uuid not null references public.linked_accounts (id) on delete cascade,
  bank_code public.bank_code,
  message_id text not null,
  subject text,
  snippet text check (snippet is null or length(snippet) <= 500),
  received_at timestamptz,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (linked_account_id, message_id)
);
alter table public.unparsed_emails enable row level security;
create policy unparsed_emails_select_own on public.unparsed_emails for select to authenticated using ((select auth.uid()) = user_id);
create policy unparsed_emails_update_own on public.unparsed_emails for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
