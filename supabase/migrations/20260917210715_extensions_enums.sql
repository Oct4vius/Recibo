-- Extensiones usadas por el sync (Plan 3). Vault viene preinstalado en Supabase.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- Enums: DEBEN reflejar 1:1 supabase/functions/_shared/parsers/types.ts
create type public.bank_code as enum ('bhd', 'banreservas', 'popular', 'apap');
create type public.tx_type as enum ('card_purchase', 'card_reversal', 'atm_withdrawal', 'transfer_out');
create type public.currency_code as enum ('DOP', 'USD');

create type public.mail_provider as enum ('gmail', 'outlook');
create type public.account_status as enum ('active', 'error', 'revoked', 'paused');
create type public.tx_source as enum ('email', 'manual');
create type public.ignored_reason as enum ('user', 'reversed', 'unmatched_reversal');
create type public.budget_period as enum ('week', 'month');

-- Trigger genérico para columnas updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
