# Recibo

[Español](README.md) · **English**

A private Android app that turns your bank's alert emails into a spending tracker. Link your Gmail or Outlook, and
every purchase, withdrawal or transfer your bank emails you about shows up in the app on its own, added to the week's
and month's spending, with budgets, categories, history and alerts at 80 % and 100 %.

It is a personal project for a small group of users: it is not in any store, sign-up is closed and it is installed as
an APK. The app's interface is in Spanish. Privacy policy: <https://oct4vius.github.io/Recibo/privacidad.html>.

## What it does

- **Links email accounts** (Gmail and Outlook/Hotmail) with read-only permission. The phone never stores email tokens:
  the app hands the authorization code to the server, which keeps the refresh token in Supabase Vault.
- **Reads only bank emails.** Every 15 minutes the server looks for new emails from known bank senders, parses them with
  per-bank, per-template rules and stores the transactions without duplicates.
- **Keeps the tally.** Spending for the week (starting Monday) and the month, compared with the previous period; weekly
  and monthly budgets; automatic categories through merchant rules; history by week, month and year; manual expenses.
- **Dollars to pesos.** USD expenses are converted with the Central Bank (BCRD) selling rate for the day of the expense,
  with a configurable fallback rate when none is published.
- **Reversals.** A reversed purchase is matched with its reversal by exact amount and stops counting.
- **Budget alerts** as local notifications when spending crosses 80 % and 100 %, once per threshold and period, with
  no amounts in the text.

### Banks

| Bank | Status |
|---|---|
| BHD | Purchases, reversals, ATM withdrawals, fund holds, transfers and service payments |
| Banreservas, Popular, APAP | Candidates: their emails are stored unparsed until a real sample is available |

Adding a bank or a new template means creating one file and registering it; the full recipe (in Spanish) is in
[`docs/agregar-banco.md`](docs/agregar-banco.md).

## How it works

```
Phone (Expo)                          Supabase
─────────────────                     ──────────────────────────────────────────────
login (email + password)    ───────▶  Auth (closed sign-up)
link email (code)           ───────▶  link-account ──▶ refresh token in Vault
                                      pg_cron every 15 min ──▶ sync-mail
                                          Gmail / Graph ──▶ parsers ──▶ ingest_transactions
                                      pg_cron twice a day ──▶ fetch-usd-rates (BCRD)
screens (TanStack Query)    ◀───────  Postgres with RLS + aggregate RPCs
background task             ───────▶  claim_budget_alerts ──▶ local notification
```

- **Security:** RLS on every table (`user_id = auth.uid()`); the app uses the anon key and only the Edge Functions use
  the service role. Secrets live in `supabase secrets`, never in the app.
- **Money:** `numeric(14,2)` and sums in SQL. What counts as spending and the conversion formula are each defined once,
  in views (`spending_transactions`, `transactions_with_rate`).
- **Cost:** everything fits in the free tiers of Supabase and Expo.

## Stack

- **App:** Expo (managed) + Expo Router, React Native, strict TypeScript, NativeWind, TanStack Query,
  `@supabase/supabase-js`, `expo-notifications` + `expo-background-task`.
- **Backend:** Supabase (Postgres 17, RLS, Vault, `pg_cron`, `pg_net`) and Edge Functions on Deno.
- **Email:** Microsoft Graph (PKCE, public client) and the Gmail API (`serverAuthCode`).
- **Tooling:** Bun, Vitest, `deno test`, pgTAP, EAS Build, GitHub Actions.

## Layout

```
app/                  Expo Router routes (navigation and composition only)
src/features/<domain>/  logic per domain: api, hooks, components
src/components/       generic UI components
src/lib/, src/theme/  utilities (money, dates, env) and visual theme
supabase/migrations/  versioned SQL
supabase/tests/       pgTAP
supabase/functions/   Edge Functions (link-account, unlink-account, sync-mail, fetch-usd-rates)
  _shared/parsers/    one file per bank and template, with their fixtures
  _shared/mail/       email providers (Gmail, Graph)
scripts/              development tools
tests/unit/           Vitest
docs/                 scope, bank recipe, design specs (in Spanish)
```

## Development

### Requirements

- [Bun](https://bun.sh) (package manager and scripts; npm, yarn and npx are not used)
- [Deno](https://deno.com) 2 (Edge Function tests and lint)
- Docker Desktop (local Supabase)
- An Expo account to build with EAS

### Getting started

```bash
bun install
```

1. Copy `.env.example` to `.env.local` and `supabase/functions/.env.example` to `supabase/functions/.env` with your
   values. `EXPO_PUBLIC_*` variables are public (they ship inside the APK); secrets go only in
   `supabase/functions/.env` and, on the remote project, through `supabase secrets set`.
2. Start the local database and apply migrations and seed data:

   ```bash
   bun run db:start
   ```

   ```bash
   bun run db:reset
   ```

3. Serve the Edge Functions locally:

   ```bash
   bun run functions:serve
   ```

4. Build a development client (Expo Go does not work: the OAuth return uses the app's own `recibo://` scheme) and start
   Metro:

   ```bash
   bunx eas-cli build --profile development --platform android
   ```

   ```bash
   bun run start
   ```

There is no cron locally: trigger a sync by hand with `bun run dev:sync`, and link an account from the terminal with
`bun run dev:link-outlook` or `bun run dev:link-gmail`.

### Commands

| Command | What it does |
|---|---|
| `bun run check` | typecheck + Vitest + `deno test` + lint; required before calling anything done |
| `bun run check:db` | resets the local database and runs pgTAP; required when migrations or SQL tests change |
| `bun run db:types` | regenerates the database types after a migration |
| `bun run fixtures:build` | builds parser fixtures from local anonymized `.eml` files |
| `bun run dev:download-eml` | downloads emails that could not be parsed, to write their template |
| `bun run eml:anonymize` | anonymizes an `.eml` before it becomes a fixture |
| `bun run verify:bundle` | bundles Android without a device to validate Metro, Babel and NativeWind |

### Builds

| Profile | Use |
|---|---|
| `development` | development client with Metro |
| `preview` | test APK |
| `production` | final APK (version from `app.json`) |

```bash
bunx eas-cli build --profile preview --platform android
```

## Contributing

The project rules (architecture, security, tests and conventions) are in [`CLAUDE.md`](CLAUDE.md) and the scope in
[`docs/ALCANCE.md`](docs/ALCANCE.md), both in Spanish; anything out of scope is not implemented. Work happens on the
`dev` branch and reaches `main` through a PR with green CI. The repository is public: real emails, `.eml` files, tokens
and `.env` files are never committed.
