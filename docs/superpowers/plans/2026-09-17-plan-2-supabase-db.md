# Plan 2 — Base de datos Supabase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el esquema completo de la app en Supabase (local y remoto): enums alineados con los tipos de los parsers, diez tablas con RLS, categorías por defecto, funciones SQL de agregados para inicio e historial, tests pgTAP para cada tabla y función, y tipos TypeScript generados que las Edge Functions (Plan 3) y la app (Plan 4) consumirán.

**Architecture:** Todo el esquema vive en migraciones SQL versionadas bajo `supabase/migrations/`, una por concepto, aplicadas con la CLI de Supabase (dependencia de desarrollo de Bun). RLS en todas las tablas con la policy `(select auth.uid()) = user_id`; las tablas que escribe el sync (linked_accounts, sync_logs, unparsed_emails, budget_alerts) solo tienen policies de lectura para el usuario y las escribe el service role, que salta RLS. Los agregados se calculan en funciones `security invoker` (RLS aplica) que convierten USD a DOP con la tasa del perfil y usan la zona horaria del perfil. Cada migración trae su test pgTAP en `supabase/tests/`. Los tipos se generan desde la base local a un único archivo compartido y un test de Deno comprueba en compilación que los enums de Postgres coinciden con los tipos de los parsers.

**Tech Stack:** Supabase CLI (npm `supabase`, vía Bun), Postgres 15+, pgTAP (`supabase test db`), Docker Desktop (stack local), Deno 2 (test de tipos), Bun scripts.

**Spec:** `docs/ALCANCE.md` (secciones 3.1, 3.3, 3.5, 4, 6, 8.1) y `CLAUDE.md` (secciones "Seguridad — reglas duras", "Supabase / Postgres — reglas", "Testing"). Roadmap: `docs/superpowers/plans/2026-09-17-roadmap.md`.

## Global Constraints

- Package manager: **Bun**. Nunca `npm`, `yarn` ni `npx`. La CLI de Supabase se invoca con `bun run <script>` o `bunx supabase ...`.
- Rama de trabajo: `plan-2-supabase-db`, creada desde la punta de `plan-1-fundacion-parsers-bhd` (`main` sigue sin commits).
- **RLS en todas las tablas** (`alter table ... enable row level security`). Policies con `(select auth.uid()) = user_id`, roles `to authenticated`. Tabla nueva sin RLS = migración incompleta.
- **Dinero**: `numeric(14,2)`, nunca `float`. Sumas en SQL. **Fechas**: `timestamptz`; límites de semana/mes en la zona del perfil (`profiles.timezone`, default `America/Santo_Domingo`); la semana empieza **lunes** (`date_trunc('week', ...)` ya lo hace).
- Enums de Postgres deben reflejar **1:1** los tipos de `supabase/functions/_shared/parsers/types.ts`: `bank_code` = `'bhd' | 'banreservas' | 'popular' | 'apap'`; `tx_type` = `'card_purchase' | 'card_reversal' | 'atm_withdrawal' | 'transfer_out'`; `currency_code` = `'DOP' | 'USD'`.
- Registro cerrado: `[auth] enable_signup = false` en `supabase/config.toml`; en el remoto se apaga a mano en el dashboard (la config no se puede empujar sin `supabase login`).
- **Sin ORM.** Solo SQL en migraciones y `supabase gen types`.
- Ningún secreto en el repo: la connection string del remoto vive en `.env.local` (gitignored). Los comandos que la usan la leen de ahí; nunca se pega en un archivo versionado ni en un reporte.
- `supabase/functions/_shared/parsers/**` **no se toca** en este plan (salvo agregar el test de enums en `parsers/db-enums.test.ts`).
- Cada test pgTAP: `begin; select plan(N); ... select * from finish(); rollback;`. Si pgTAP reporta que el plan no coincide con los asserts corridos, corregir `N`; **nunca** eliminar asserts.
- Cada commit termina con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (segundo `-m`).
- Antes de marcar una tarea como hecha: `bun run check` en verde (Plan 1, no necesita Docker) y `bun run check:db` en verde (reset + pgTAP, necesita Docker).

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `package.json` (modificar) | scripts `db:start`, `db:stop`, `db:status`, `db:reset`, `db:test`, `db:types`, `check:db`; devDependency `supabase` |
| `supabase/config.toml` | Config local: `project_id`, `[auth] enable_signup = false`, `[db.seed]` |
| `supabase/seed.sql` | Solo datos de desarrollo local (vacío salvo comentario en este plan) |
| `supabase/migrations/<ts>_extensions_enums.sql` | `pg_cron`, `pg_net`, `supabase_vault`; enums; `set_updated_at()` |
| `supabase/migrations/<ts>_profiles.sql` | `profiles` + trigger `handle_new_user` + RLS |
| `supabase/migrations/<ts>_categories.sql` | `categories`, `merchant_rules`, categorías por defecto, RLS |
| `supabase/migrations/<ts>_linked_accounts.sql` | `linked_accounts` + RLS (solo lectura para el usuario) |
| `supabase/migrations/<ts>_transactions.sql` | `transactions` + constraints + índices + RLS |
| `supabase/migrations/<ts>_budgets_ops.sql` | `budgets`, `budget_alerts`, `push_tokens`, `sync_logs`, `unparsed_emails` + RLS |
| `supabase/migrations/<ts>_rpc_aggregates.sql` | `get_spending_summary`, `get_history` |
| `supabase/tests/*.test.sql` | Un archivo pgTAP por migración |
| `supabase/functions/_shared/database.types.ts` | Tipos generados (`supabase gen types`) — única fuente para Plan 3 y Plan 4 |
| `supabase/functions/_shared/parsers/db-enums.test.ts` | Test Deno: enums Postgres ≡ tipos TS (en compilación) |
| `CLAUDE.md`, roadmap (modificar) | Comandos y estructura reales |

---

### Task 1: Rama, CLI de Supabase, proyecto local y configuración

**Files:**
- Modify: `package.json`
- Create (por `supabase init`): `supabase/config.toml`, `supabase/seed.sql`
- Modify: `.gitignore` solo si `supabase init` propone entradas que falten

**Interfaces:**
- Produces: scripts `bun run db:start|db:stop|db:status|db:reset|db:test|db:types|check:db`; stack local corriendo en `http://127.0.0.1:54321`, Postgres en `54322`.

- [ ] **Step 1: Crear la rama de trabajo**

Run:
```bash
cd "C:/Users/arman/Documents/Programación/notificaciones-bancarias"
git checkout -b plan-2-supabase-db plan-1-fundacion-parsers-bhd
git status --short
```
Expected: rama nueva en la punta de plan-1, árbol limpio.

- [ ] **Step 2: Verificar Docker**

Run: `docker info --format '{{.ServerVersion}}'`
Si imprime una versión, seguir. Si falla ("cannot connect"), arrancar Docker Desktop:
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```
y reintentar `docker info` cada 15 s hasta que responda (máx. 3 min). Si no aparece, **STOP** y reportar BLOCKED: el stack local no puede levantarse sin Docker.

- [ ] **Step 3: Instalar la CLI como devDependency**

Run:
```bash
bun add -d supabase --trust
bunx supabase --version
```
Expected: versión impresa (2.x o superior). `--trust` permite el postinstall que descarga el binario. Si `bunx supabase` no encuentra el binario, correr `bun pm trust supabase && bun install` y reintentar.

- [ ] **Step 4: Inicializar el proyecto Supabase**

Run:
```bash
bunx supabase init
ls supabase/
git status --short
```
Expected: se crean `supabase/config.toml` y `supabase/seed.sql` (si `init` pregunta por configuración de IDE, responder no). La carpeta `supabase/functions/` existente **no** debe modificarse. Si `init` agregó líneas a `.gitignore`, conservarlas.

- [ ] **Step 5: Configurar `supabase/config.toml`**

Editar estas claves (buscar cada sección existente y cambiar solo el valor; no reescribir el archivo):
```toml
project_id = "gastos-app"

[auth]
enable_signup = false

[auth.email]
enable_signup = false
enable_confirmations = false

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

- [ ] **Step 6: Dejar `supabase/seed.sql` solo para desarrollo local**

Reemplazar su contenido por:
```sql
-- Datos SOLO para desarrollo local. Las categorías por defecto y todo lo que
-- deba existir en producción van en migraciones, no aquí.
-- Plan 3 agrega aquí los secretos de Vault para el cron local (project_url, etc.).
```

- [ ] **Step 7: Agregar scripts a `package.json`**

Agregar dentro de `"scripts"` (mantener los existentes):
```json
"db:start": "supabase start",
"db:stop": "supabase stop",
"db:status": "supabase status",
"db:reset": "supabase db reset",
"db:test": "supabase test db",
"db:types": "supabase gen types --lang typescript --local --schema public > supabase/functions/_shared/database.types.ts",
"check:db": "bun run db:reset && bun run db:test"
```
Si `supabase gen types --lang typescript` responde "unknown flag", cambiar el script a `supabase gen types typescript --local --schema public > ...` (sintaxis de la CLI anterior) y anotarlo en el reporte.

- [ ] **Step 8: Levantar el stack local**

Run:
```bash
bun run db:start
bun run db:status
```
Expected: la primera vez descarga imágenes (varios minutos). `db:status` imprime `API URL: http://127.0.0.1:54321`, `DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres`, anon key y service_role key. **No copiar las keys al reporte.**

- [ ] **Step 9: Verificar que pgTAP corre en vacío y que el check de Plan 1 sigue verde**

Run:
```bash
bun run db:reset
bun run db:test
bun run check
```
Expected: `db:reset` aplica 0 migraciones y el seed; `db:test` termina sin error (sin tests aún); `check` verde (56 tests + lint).

- [ ] **Step 10: Commit**

```bash
git add package.json bun.lock supabase/config.toml supabase/seed.sql .gitignore
git commit -m "chore(db): add supabase cli, local project config and db scripts" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Extensiones, enums y helper `set_updated_at`

**Files:**
- Create: `supabase/migrations/<ts>_extensions_enums.sql` (con `bunx supabase migration new extensions_enums`)
- Test: `supabase/tests/extensions_enums.test.sql`

**Interfaces:**
- Produces: tipos `public.bank_code`, `public.tx_type`, `public.currency_code`, `public.mail_provider`, `public.account_status`, `public.tx_source`, `public.ignored_reason`, `public.budget_period`; función `public.set_updated_at()` (trigger). Extensiones `pg_cron`, `pg_net`, `supabase_vault` habilitadas.

- [ ] **Step 1: Escribir el test que falla**

Run: `bunx supabase test new extensions_enums.test` (crea `supabase/tests/extensions_enums.test.sql`). Reemplazar su contenido por:
```sql
begin;
select plan(13);

select has_extension('pg_cron', 'pg_cron enabled');
select has_extension('pg_net', 'pg_net enabled');
select has_extension('supabase_vault', 'vault enabled');

select has_enum('public', 'bank_code', 'enum bank_code exists');
select enum_has_labels('public', 'bank_code', array['bhd', 'banreservas', 'popular', 'apap'], 'bank_code labels mirror parsers/types.ts BankCode');

select has_enum('public', 'tx_type', 'enum tx_type exists');
select enum_has_labels('public', 'tx_type', array['card_purchase', 'card_reversal', 'atm_withdrawal', 'transfer_out'], 'tx_type labels mirror TxType');

select has_enum('public', 'currency_code', 'enum currency_code exists');
select enum_has_labels('public', 'currency_code', array['DOP', 'USD'], 'currency_code labels mirror Currency');

select enum_has_labels('public', 'mail_provider', array['gmail', 'outlook'], 'mail_provider labels');
select enum_has_labels('public', 'account_status', array['active', 'error', 'revoked', 'paused'], 'account_status labels');
select enum_has_labels('public', 'ignored_reason', array['user', 'reversed', 'unmatched_reversal'], 'ignored_reason labels');

select has_function('public', 'set_updated_at', 'set_updated_at() exists');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y ver que falla**

Run: `bun run db:reset && bun run db:test`
Expected: fallan los asserts de enums/extensiones (`not ok`).

- [ ] **Step 3: Crear la migración**

Run: `bunx supabase migration new extensions_enums`. Contenido del archivo creado en `supabase/migrations/`:
```sql
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
```

- [ ] **Step 4: Correr los tests**

Run: `bun run check:db`
Expected: `ok 1..13`, sin `not ok`. Si `create extension supabase_vault` falla en local porque ya está instalada con otro nombre, dejar solo `pg_cron` y `pg_net`, cambiar el assert de vault por `select has_schema('vault', 'vault schema exists');` y anotarlo en el reporte.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): enable pg_cron, pg_net, vault; add enums mirroring parser types" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Tabla `profiles` con creación automática y RLS

**Files:**
- Create: `supabase/migrations/<ts>_profiles.sql`
- Test: `supabase/tests/profiles.test.sql`

**Interfaces:**
- Consumes: `currency_code`, `set_updated_at()` (Task 2).
- Produces: `public.profiles(user_id, timezone, primary_currency, usd_rate, created_at, updated_at)`; trigger `on_auth_user_created` que inserta el perfil. Las RPC de Task 8 leen `timezone` y `usd_rate`.

- [ ] **Step 1: Escribir el test que falla**

`supabase/tests/profiles.test.sql`:
```sql
begin;
select plan(12);

select has_table('public', 'profiles', 'profiles exists');
select col_type_is('public', 'profiles', 'usd_rate', 'numeric(10,4)', 'usd_rate is numeric(10,4)');
select is((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), true, 'RLS enabled on profiles');
select policies_are('public', 'profiles', array['profiles_select_own', 'profiles_update_own'], 'exactly the expected policies');

-- Crear un usuario dispara la creación del perfil con defaults
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');

select results_eq(
  $$select timezone, primary_currency::text, usd_rate from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values ('America/Santo_Domingo'::text, 'DOP'::text, 60.0000::numeric)$$,
  'profile auto-created with defaults'
);

-- anon: sin acceso
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon cannot read profiles');

-- owner: lee y actualiza el suyo
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select count(*)::int from public.profiles$$, $$values (1)$$, 'owner sees only own profile');
select results_eq(
  $$update public.profiles set usd_rate = 61.5 where user_id = '11111111-1111-1111-1111-111111111111' returning usd_rate$$,
  $$values (61.5000::numeric)$$,
  'owner updates own usd_rate'
);
select throws_ok(
  $$update public.profiles set usd_rate = 0 where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '23514', null, 'usd_rate must be positive'
);
select throws_ok(
  $$insert into public.profiles (user_id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501', null, 'authenticated cannot insert profiles directly'
);

-- other: no ve ni toca el perfil ajeno
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'$$, 'other user cannot see owner profile');
select is_empty($$update public.profiles set usd_rate = 99 where user_id = '11111111-1111-1111-1111-111111111111' returning user_id$$, 'other user updates nothing');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y ver que falla**

Run: `bun run check:db`
Expected: `not ok` en `profiles exists` y siguientes.

- [ ] **Step 3: Crear la migración**

Run: `bunx supabase migration new profiles`. Contenido:
```sql
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'America/Santo_Domingo',
  primary_currency public.currency_code not null default 'DOP',
  -- Tasa fija DOP por USD para totales consolidados (ALCANCE 3.5)
  usd_rate numeric(10,4) not null default 60.0000 check (usd_rate > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sin policy de insert/delete: el perfil lo crea el trigger y muere con el usuario.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 4: Correr los tests**

Run: `bun run check:db`
Expected: 13 + 12 asserts `ok`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): add profiles with auto-creation trigger and RLS" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `categories`, `merchant_rules` y categorías por defecto

**Files:**
- Create: `supabase/migrations/<ts>_categories.sql`
- Test: `supabase/tests/categories.test.sql`

**Interfaces:**
- Produces: `public.categories(id, user_id null, name, icon, color, counts_as_spending, created_at)`; `public.merchant_rules(id, user_id, pattern, category_id, priority, created_at)`. Categoría por defecto **"Transferencias propias"** con `counts_as_spending = false`. Las RPC (Task 8) filtran por `counts_as_spending`.

- [ ] **Step 1: Escribir el test que falla**

`supabase/tests/categories.test.sql`:
```sql
begin;
select plan(14);

select has_table('public', 'categories', 'categories exists');
select has_table('public', 'merchant_rules', 'merchant_rules exists');
select is((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), true, 'RLS on categories');
select is((select relrowsecurity from pg_class where oid = 'public.merchant_rules'::regclass), true, 'RLS on merchant_rules');

-- Defaults sembrados por la migración
select results_eq(
  $$select count(*)::int from public.categories where user_id is null$$,
  $$values (13)$$,
  '13 default categories'
);
select results_eq(
  $$select counts_as_spending from public.categories where user_id is null and name = 'Transferencias propias'$$,
  $$values (false)$$,
  'Transferencias propias does not count as spending'
);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq($$select count(*)::int from public.categories$$, $$values (13)$$, 'owner sees defaults');
select results_eq(
  $$insert into public.categories (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Mascotas') returning name$$,
  $$values ('Mascotas'::text)$$,
  'owner creates own category'
);
select throws_ok(
  $$insert into public.categories (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'mascotas')$$,
  '23505', null, 'category names unique per user (case-insensitive)'
);
select is_empty(
  $$update public.categories set name = 'Hackeada' where user_id is null returning id$$,
  'owner cannot edit default categories'
);
select results_eq(
  $$insert into public.merchant_rules (user_id, pattern, category_id, priority)
    values ('11111111-1111-1111-1111-111111111111', 'UBER', (select id from public.categories where user_id is null and name = 'Transporte'), 10)
    returning pattern$$,
  $$values ('UBER'::text)$$,
  'owner creates rule pointing at a default category'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq($$select count(*)::int from public.categories$$, $$values (13)$$, 'other sees only defaults, not owner category');
select is_empty($$select * from public.merchant_rules$$, 'other sees no rules of owner');
select throws_ok(
  $$insert into public.merchant_rules (user_id, pattern, category_id)
    values ('22222222-2222-2222-2222-222222222222', 'X', (select id from public.categories where name = 'Mascotas' limit 1))$$,
  '42501', null, 'other cannot point a rule at owner private category'
);

select * from finish();
rollback;
```
Nota: el último `throws_ok` usa una subconsulta que para `other` devuelve `null` (no ve la categoría) — el `with check` de la policy la rechaza con `42501`. Si Postgres devuelve `23502` (not null) en su lugar, cambiar el código esperado a `23502` y anotarlo: ambos demuestran que la fila no entra.

- [ ] **Step 2: Correr y ver que falla**

Run: `bun run check:db` → `not ok` en `categories exists`.

- [ ] **Step 3: Crear la migración**

Run: `bunx supabase migration new categories`. Contenido:
```sql
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
```

- [ ] **Step 4: Correr los tests**

Run: `bun run check:db`
Expected: todo `ok` (13 + 12 + 14).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): add categories with defaults, merchant_rules and RLS" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `linked_accounts` (solo lectura para el usuario)

**Files:**
- Create: `supabase/migrations/<ts>_linked_accounts.sql`
- Test: `supabase/tests/linked_accounts.test.sql`

**Interfaces:**
- Consumes: `mail_provider`, `account_status`, `set_updated_at()`.
- Produces: `public.linked_accounts(id, user_id, provider, email, vault_secret_id, sync_cursor, status, last_sync_at, last_error, created_at, updated_at)`. Plan 3 la escribe con service role.

- [ ] **Step 1: Escribir el test que falla**

`supabase/tests/linked_accounts.test.sql`:
```sql
begin;
select plan(8);

select has_table('public', 'linked_accounts', 'linked_accounts exists');
select is((select relrowsecurity from pg_class where oid = 'public.linked_accounts'::regclass), true, 'RLS on linked_accounts');
select policies_are('public', 'linked_accounts', array['linked_accounts_select_own'], 'user can only read');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
-- El sync (service role, aquí postgres) crea la cuenta
insert into public.linked_accounts (user_id, provider, email)
  values ('11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');

select throws_ok(
  $$insert into public.linked_accounts (user_id, provider, email) values ('11111111-1111-1111-1111-111111111111', 'outlook', 'OWNER@outlook.com')$$,
  '23505', null, 'same provider+email unique per user (case-insensitive)'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select email from public.linked_accounts$$, $$values ('owner@outlook.com'::text)$$, 'owner reads own account');
select throws_ok(
  $$insert into public.linked_accounts (user_id, provider, email) values ('11111111-1111-1111-1111-111111111111', 'gmail', 'x@gmail.com')$$,
  '42501', null, 'user cannot insert accounts (Edge Function does)'
);
select is_empty($$update public.linked_accounts set status = 'revoked' returning id$$, 'user cannot update accounts');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.linked_accounts$$, 'other sees nothing');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y ver que falla** — `bun run check:db` → `not ok` en `linked_accounts exists`.

- [ ] **Step 3: Crear la migración**

Run: `bunx supabase migration new linked_accounts`. Contenido:
```sql
create table public.linked_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.mail_provider not null,
  email text not null,
  -- id del secreto en vault.secrets con el refresh token. NUNCA el token en claro.
  vault_secret_id uuid,
  -- Gmail: historyId; Outlook: deltaLink. Opaco para la app.
  sync_cursor text,
  status public.account_status not null default 'active',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index linked_accounts_user_provider_email_key
  on public.linked_accounts (user_id, provider, lower(email));

create trigger linked_accounts_set_updated_at
  before update on public.linked_accounts
  for each row execute function public.set_updated_at();

alter table public.linked_accounts enable row level security;

-- El usuario solo lee. Vincular/desvincular pasa por Edge Functions (service role).
create policy linked_accounts_select_own on public.linked_accounts
  for select to authenticated
  using ((select auth.uid()) = user_id);
```

- [ ] **Step 4: Correr los tests** — `bun run check:db` → todo `ok`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): add linked_accounts (read-only for users)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `transactions`

**Files:**
- Create: `supabase/migrations/<ts>_transactions.sql`
- Test: `supabase/tests/transactions.test.sql`

**Interfaces:**
- Consumes: enums, `linked_accounts`, `categories`, `set_updated_at()`.
- Produces: `public.transactions` con clave de idempotencia `(linked_account_id, message_id)`; Plan 3 hace `upsert ... on conflict (linked_account_id, message_id) do nothing`. `message_id` es `<providerMessageId>#<rowIndex>` (CLAUDE.md).

- [ ] **Step 1: Escribir el test que falla**

`supabase/tests/transactions.test.sql`:
```sql
begin;
select plan(15);

select has_table('public', 'transactions', 'transactions exists');
select col_type_is('public', 'transactions', 'amount', 'numeric(14,2)', 'amount is numeric(14,2)');
select col_type_is('public', 'transactions', 'occurred_at', 'timestamp with time zone', 'occurred_at is timestamptz');
select is((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), true, 'RLS on transactions');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into public.linked_accounts (id, user_id, provider, email)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');

-- El sync inserta (service role = postgres aquí)
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, card_last4, template_id)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 275.72, 'DOP', 'UBER*RIDES', '2026-09-16T22:42:00-04:00', 'email', '<m1@bhd.com.do>#0', '1234', 'bhd/transactions-table');

select throws_ok(
  $$insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, occurred_at, source, message_id)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 1, 'DOP', now(), 'email', '<m1@bhd.com.do>#0')$$,
  '23505', null, 'same message_id per account is rejected (idempotency key)'
);
select throws_ok(
  $$insert into public.transactions (user_id, type, amount, currency, occurred_at, source)
    values ('11111111-1111-1111-1111-111111111111', 'card_purchase', -5, 'DOP', now(), 'manual')$$,
  '23514', null, 'amount must be positive'
);
select throws_ok(
  $$insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, occurred_at, source)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 5, 'DOP', now(), 'email')$$,
  '23514', null, 'email transactions require message_id'
);
select throws_ok(
  $$insert into public.transactions (user_id, type, amount, currency, occurred_at, source, card_last4)
    values ('11111111-1111-1111-1111-111111111111', 'card_purchase', 5, 'DOP', now(), 'manual', '12a4')$$,
  '23514', null, 'card_last4 must be 4 digits'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select merchant from public.transactions$$, $$values ('UBER*RIDES'::text)$$, 'owner reads own transaction');
select results_eq(
  $$insert into public.transactions (user_id, type, amount, currency, merchant, occurred_at, source)
    values ('11111111-1111-1111-1111-111111111111', 'card_purchase', 150, 'DOP', 'Colmado', now(), 'manual') returning source::text$$,
  $$values ('manual'::text)$$,
  'owner adds a manual expense'
);
select throws_ok(
  $$insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, occurred_at, source, message_id)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 5, 'DOP', now(), 'email', '<fake>#0')$$,
  '42501', null, 'owner cannot insert email-sourced transactions (only sync does)'
);
select results_eq(
  $$update public.transactions set is_ignored = true, ignored_reason = 'user' where message_id = '<m1@bhd.com.do>#0' returning is_ignored$$,
  $$values (true)$$,
  'owner ignores an email transaction'
);
select is_empty(
  $$delete from public.transactions where message_id = '<m1@bhd.com.do>#0' returning id$$,
  'owner cannot delete email transactions (ignore instead)'
);
select results_eq(
  $$delete from public.transactions where source = 'manual' returning merchant$$,
  $$values ('Colmado'::text)$$,
  'owner deletes own manual transaction'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.transactions$$, 'other sees nothing');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y ver que falla** — `bun run check:db` → `not ok` en `transactions exists`.

- [ ] **Step 3: Crear la migración**

Run: `bunx supabase migration new transactions`. Contenido:
```sql
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
```

- [ ] **Step 4: Correr los tests** — `bun run check:db` → todo `ok`. Si `ignored_reason` en el `update` del test falla por el check de forma, es que la migración está bien y el test mandó `is_ignored=true` con reason: revisar que el test lo hace (sí, `ignored_reason = 'user'`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): add transactions with idempotency key, shape checks and RLS" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: `budgets`, `budget_alerts`, `push_tokens`, `sync_logs`, `unparsed_emails`

**Files:**
- Create: `supabase/migrations/<ts>_budgets_ops.sql`
- Test: `supabase/tests/budgets_ops.test.sql`

**Interfaces:**
- Produces las cinco tablas. Plan 3 escribe `budget_alerts`, `sync_logs`, `unparsed_emails` con service role; el usuario gestiona `budgets` y `push_tokens`, lee las demás y puede marcar `unparsed_emails.resolved`.

- [ ] **Step 1: Escribir el test que falla**

`supabase/tests/budgets_ops.test.sql`:
```sql
begin;
select plan(14);

select has_table('public', 'budgets', 'budgets exists');
select has_table('public', 'budget_alerts', 'budget_alerts exists');
select has_table('public', 'push_tokens', 'push_tokens exists');
select has_table('public', 'sync_logs', 'sync_logs exists');
select has_table('public', 'unparsed_emails', 'unparsed_emails exists');
select is(
  (select bool_and(relrowsecurity) from pg_class where oid in ('public.budgets'::regclass, 'public.budget_alerts'::regclass, 'public.push_tokens'::regclass, 'public.sync_logs'::regclass, 'public.unparsed_emails'::regclass)),
  true, 'RLS on all five tables'
);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
insert into public.linked_accounts (id, user_id, provider, email)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');
insert into public.unparsed_emails (user_id, linked_account_id, bank_code, message_id, subject, snippet, received_at)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', '<u1>', 'Estado de cuenta', 'Tu estado...', now());

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$insert into public.budgets (user_id, period, limit_amount) values ('11111111-1111-1111-1111-111111111111', 'month', 40000) returning thresholds$$,
  $$values (array[80, 100])$$,
  'owner creates monthly budget with default thresholds'
);
select throws_ok(
  $$insert into public.budgets (user_id, period, limit_amount) values ('11111111-1111-1111-1111-111111111111', 'month', 1)$$,
  '23505', null, 'one budget per period per user'
);
select results_eq(
  $$insert into public.push_tokens (user_id, expo_token) values ('11111111-1111-1111-1111-111111111111', 'ExponentPushToken[abc]') returning platform$$,
  $$values ('android'::text)$$,
  'owner registers push token'
);
select results_eq($$select subject from public.unparsed_emails$$, $$values ('Estado de cuenta'::text)$$, 'owner reads unparsed emails');
select results_eq(
  $$update public.unparsed_emails set resolved = true returning resolved$$,
  $$values (true)$$,
  'owner marks unparsed email resolved'
);
select throws_ok(
  $$insert into public.sync_logs (user_id, linked_account_id, fetched, parsed, unparsed) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 1, 0)$$,
  '42501', null, 'user cannot write sync_logs'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select * from public.budgets$$, 'other sees no budgets');
select is_empty($$select * from public.unparsed_emails$$, 'other sees no unparsed emails');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y ver que falla** — `bun run check:db` → `not ok` en `budgets exists`.

- [ ] **Step 3: Crear la migración**

Run: `bunx supabase migration new budgets_ops`. Contenido:
```sql
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
```

- [ ] **Step 4: Correr los tests** — `bun run check:db` → todo `ok`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): add budgets, budget_alerts, push_tokens, sync_logs, unparsed_emails" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: RPC de agregados `get_spending_summary` y `get_history`

**Files:**
- Create: `supabase/migrations/<ts>_rpc_aggregates.sql`
- Test: `supabase/tests/rpc_aggregates.test.sql`

**Interfaces:**
- Consumes: `profiles.timezone`, `profiles.usd_rate`, `transactions`, `categories.counts_as_spending`.
- Produces (la app las llama con `supabase.rpc(...)`):
  - `get_spending_summary(p_period budget_period, p_ref_date date default null)` → una fila `(period_start date, period_end date /*exclusivo*/, total_dop numeric, previous_total_dop numeric, tx_count integer, by_currency jsonb)`.
  - `get_history(p_granularity text /*'week'|'month'|'year'*/, p_from date, p_to date)` → filas `(bucket_start date, total_dop numeric, tx_count integer)`, incluyendo buckets en cero.
- Reglas de "gasto": `is_ignored = false`, `type in ('card_purchase','atm_withdrawal','transfer_out')`, y categoría nula o con `counts_as_spending = true`. USD → DOP con `round(amount * usd_rate, 2)`.

- [ ] **Step 1: Escribir el test que falla**

`supabase/tests/rpc_aggregates.test.sql`:
```sql
begin;
select plan(9);

select has_function('public', 'get_spending_summary', array['public.budget_period', 'date'], 'get_spending_summary exists');
select has_function('public', 'get_history', array['text', 'date', 'date'], 'get_history exists');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'other@example.com');
update public.profiles set usd_rate = 60 where user_id = '11111111-1111-1111-1111-111111111111';
insert into public.linked_accounts (id, user_id, provider, email)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'outlook', 'owner@outlook.com');

-- Semana de referencia: lunes 2026-09-14 .. domingo 2026-09-20 (hora dominicana)
insert into public.transactions (user_id, linked_account_id, bank_code, type, amount, currency, merchant, occurred_at, source, message_id, category_id, is_ignored, ignored_reason) values
  -- cuenta: 275.72 DOP, miércoles 16
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 275.72, 'DOP', 'UBER*RIDES', '2026-09-16T22:42:00-04:00', 'email', '<a>#0', null, false, null),
  -- cuenta: 12 USD → 720 DOP, jueves 17
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 12.00, 'USD', 'NETFLIX', '2026-09-17T09:00:00-04:00', 'email', '<b>#0', null, false, null),
  -- NO cuenta: ignorada
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 999.00, 'DOP', 'IGNORADA', '2026-09-17T10:00:00-04:00', 'email', '<c>#0', null, true, 'user'),
  -- NO cuenta: reversa
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_reversal', 434.22, 'DOP', null, '2026-09-16T21:31:00-04:00', 'email', '<d>#0', null, true, 'unmatched_reversal'),
  -- NO cuenta: transferencia propia (categoría counts_as_spending = false)
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'transfer_out', 3500.00, 'DOP', 'JUAN PEREZ', '2026-09-16T09:53:00-04:00', 'email', '<e>#0', (select id from public.categories where user_id is null and name = 'Transferencias propias'), false, null),
  -- cuenta en la semana ANTERIOR: 100 DOP, jueves 10
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'atm_withdrawal', 100.00, 'DOP', null, '2026-09-10T12:00:00-04:00', 'email', '<f>#0', null, false, null),
  -- cuenta como DOMINGO 20 en hora dominicana aunque en UTC ya es lunes 21 (00:30Z = 20:30 -04:00)
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bhd', 'card_purchase', 50.00, 'DOP', 'TZ EDGE', '2026-09-21T00:30:00Z', 'email', '<g>#0', null, false, null);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select period_start, period_end, total_dop, previous_total_dop, tx_count from public.get_spending_summary('week', '2026-09-17')$$,
  $$values ('2026-09-14'::date, '2026-09-21'::date, 1045.72::numeric, 100.00::numeric, 3)$$,
  'weekly summary: 275.72 + 720 + 50, previous week 100, 3 transactions'
);
select results_eq(
  $$select by_currency from public.get_spending_summary('week', '2026-09-17')$$,
  $$values ('{"DOP": 325.72, "USD": 12.00}'::jsonb)$$,
  'by_currency keeps original currencies'
);
select results_eq(
  $$select period_start, period_end, total_dop, previous_total_dop from public.get_spending_summary('month', '2026-09-17')$$,
  $$values ('2026-09-01'::date, '2026-10-01'::date, 1145.72::numeric, 0::numeric)$$,
  'monthly summary includes previous-week row, previous month empty'
);
select results_eq(
  $$select bucket_start, total_dop, tx_count from public.get_history('week', '2026-09-01', '2026-09-20') order by bucket_start$$,
  $$values ('2026-08-31'::date, 0::numeric, 0), ('2026-09-07'::date, 100.00::numeric, 1), ('2026-09-14'::date, 1045.72::numeric, 3)$$,
  'weekly history includes empty buckets and starts on Monday'
);
select results_eq(
  $$select bucket_start, total_dop from public.get_history('month', '2026-08-01', '2026-09-30') order by bucket_start$$,
  $$values ('2026-08-01'::date, 0::numeric), ('2026-09-01'::date, 1145.72::numeric)$$,
  'monthly history'
);
select throws_ok($$select * from public.get_history('day', '2026-09-01', '2026-09-30')$$, '22023', null, 'invalid granularity rejected');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select total_dop, tx_count from public.get_spending_summary('week', '2026-09-17')$$,
  $$values (0::numeric, 0)$$,
  'other user sees zero (RLS applies inside security invoker)'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y ver que falla** — `bun run check:db` → `not ok` en `get_spending_summary exists`.

- [ ] **Step 3: Crear la migración**

Run: `bunx supabase migration new rpc_aggregates`. Contenido:
```sql
-- Qué cuenta como gasto (una sola definición, reutilizada por ambas RPC)
create or replace view public.spending_transactions
with (security_invoker = true)
as
select
  t.user_id,
  t.amount,
  t.currency,
  t.occurred_at
from public.transactions t
left join public.categories c on c.id = t.category_id
where t.is_ignored = false
  and t.type in ('card_purchase', 'atm_withdrawal', 'transfer_out')
  and coalesce(c.counts_as_spending, true);

-- Resumen del período actual vs anterior, en la zona horaria del perfil.
-- period_end es EXCLUSIVO (primer día del período siguiente).
create or replace function public.get_spending_summary(p_period public.budget_period, p_ref_date date default null)
returns table (
  period_start date,
  period_end date,
  total_dop numeric,
  previous_total_dop numeric,
  tx_count integer,
  by_currency jsonb
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_rate numeric;
  v_ref date;
  v_unit interval;
  v_start date;
  v_end date;
  v_prev_start date;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select p.timezone, p.usd_rate into v_tz, v_rate from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');
  v_rate := coalesce(v_rate, 60);
  v_ref := coalesce(p_ref_date, (now() at time zone v_tz)::date);
  v_unit := case p_period when 'week' then interval '1 week' else interval '1 month' end;
  v_start := date_trunc(p_period::text, v_ref::timestamp)::date;
  v_end := (v_start + v_unit)::date;
  v_prev_start := (v_start - v_unit)::date;

  return query
  with spend as (
    select
      s.currency,
      s.amount,
      case s.currency when 'DOP' then s.amount else round(s.amount * v_rate, 2) end as dop,
      (s.occurred_at at time zone v_tz)::date as d
    from public.spending_transactions s
    where s.user_id = v_uid
      and (s.occurred_at at time zone v_tz)::date >= v_prev_start
      and (s.occurred_at at time zone v_tz)::date < v_end
  )
  select
    v_start,
    v_end,
    coalesce(sum(dop) filter (where d >= v_start), 0)::numeric,
    coalesce(sum(dop) filter (where d < v_start), 0)::numeric,
    (count(*) filter (where d >= v_start))::integer,
    coalesce(
      (select jsonb_object_agg(x.currency, x.total)
       from (select currency, sum(amount) as total from spend where d >= v_start group by currency) x),
      '{}'::jsonb
    )
  from spend;
end;
$$;

-- Historial por semana/mes/año entre dos fechas, con buckets vacíos en cero.
create or replace function public.get_history(p_granularity text, p_from date, p_to date)
returns table (bucket_start date, total_dop numeric, tx_count integer)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_rate numeric;
  v_step interval;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_granularity not in ('week', 'month', 'year') then
    raise exception 'granularity must be week, month or year' using errcode = '22023';
  end if;

  select p.timezone, p.usd_rate into v_tz, v_rate from public.profiles p where p.user_id = v_uid;
  v_tz := coalesce(v_tz, 'America/Santo_Domingo');
  v_rate := coalesce(v_rate, 60);
  v_step := case p_granularity when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '1 year' end;

  return query
  with buckets as (
    select g::date as b
    from generate_series(
      date_trunc(p_granularity, p_from::timestamp),
      date_trunc(p_granularity, p_to::timestamp),
      v_step
    ) g
  ),
  spend as (
    select
      date_trunc(p_granularity, (s.occurred_at at time zone v_tz))::date as b,
      case s.currency when 'DOP' then s.amount else round(s.amount * v_rate, 2) end as dop
    from public.spending_transactions s
    where s.user_id = v_uid
      and (s.occurred_at at time zone v_tz)::date >= date_trunc(p_granularity, p_from::timestamp)::date
      and (s.occurred_at at time zone v_tz)::date < (date_trunc(p_granularity, p_to::timestamp) + v_step)::date
  )
  select
    buckets.b,
    coalesce(sum(spend.dop), 0)::numeric,
    count(spend.dop)::integer
  from buckets
  left join spend on spend.b = buckets.b
  group by buckets.b
  order by buckets.b;
end;
$$;

revoke execute on function public.get_spending_summary(public.budget_period, date) from anon;
revoke execute on function public.get_history(text, date, date) from anon;
```

- [ ] **Step 4: Correr los tests**

Run: `bun run check:db`
Expected: todo `ok`. Si un `results_eq` falla por escala numérica (`1045.72` vs `1045.7200`), castear ambos lados a `numeric(14,2)` en la **función** (`::numeric(14,2)` en los `sum`), no en el test. Si `has_function` con firma falla por el nombre del tipo, usar `array['budget_period', 'date']` sin esquema y anotarlo.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(db): add spending summary and history RPCs over a shared spending view" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Tipos generados, test de enums ≡ tipos TS y documentación

**Files:**
- Create: `supabase/functions/_shared/database.types.ts` (generado), `supabase/functions/_shared/parsers/db-enums.test.ts`
- Modify: `CLAUDE.md` (Comandos, Estructura, sección Supabase), `docs/superpowers/plans/2026-09-17-roadmap.md` (estado Plan 2 → Ejecutado), `docs/ALCANCE.md` §4 solo si el modelo difiere de lo escrito

**Interfaces:**
- Produces: `Database` type con `public.Tables.*`, `public.Enums.*`, `public.Functions.get_spending_summary|get_history`. Plan 3 lo importa desde `../_shared/database.types.ts`; Plan 4 lo re-exporta en `src/types/database.ts`.

- [ ] **Step 1: Generar los tipos**

Run:
```bash
bun run db:types
head -20 supabase/functions/_shared/database.types.ts
grep -n "bank_code\|tx_type\|currency_code\|get_spending_summary\|get_history" supabase/functions/_shared/database.types.ts | head
```
Expected: archivo con `export type Database = { ... }` y los enums/funciones listados.

- [ ] **Step 2: Escribir el test de enums (falla si divergen)**

`supabase/functions/_shared/parsers/db-enums.test.ts`:
```ts
// Comprobación EN COMPILACIÓN: los enums de Postgres deben ser idénticos a los tipos de los parsers.
// Si alguien agrega un banco o un tipo de movimiento en un lado y no en el otro, `deno test` no compila.
import type { Database } from '../database.types.ts';
import type { BankCode, Currency, TxType } from './types.ts';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const bankCodeMatches: Equals<Database['public']['Enums']['bank_code'], BankCode> = true;
const txTypeMatches: Equals<Database['public']['Enums']['tx_type'], TxType> = true;
const currencyMatches: Equals<Database['public']['Enums']['currency_code'], Currency> = true;

Deno.test('postgres enums mirror parser types (compile-time)', () => {
  if (!bankCodeMatches || !txTypeMatches || !currencyMatches) {
    throw new Error('unreachable: type-level assertions failed');
  }
});
```
Run: `bun run test:deno`
Expected: pasa (53 tests Deno). Para probar que realmente vigila, editar temporalmente `types.ts` agregando `| 'fake'` a `BankCode`, correr `bun run test:deno` y ver el error de tipos `Type 'false' is not assignable to type 'true'`; revertir el cambio antes de seguir.

- [ ] **Step 3: Excluir el archivo generado de `deno lint`**

Crear o editar `supabase/functions/deno.json` para que quede:
```json
{
  "lint": { "exclude": ["_shared/database.types.ts"] }
}
```
Run: `bun run check` → verde.

- [ ] **Step 4: Actualizar `CLAUDE.md`**

En **Comandos**, reemplazar la línea `# Desde Plan 2: ...` por:
```bash
bun run db:start                   # stack local (Docker Desktop debe estar corriendo)
bun run db:reset                   # aplica migraciones + seed.sql en local
bun run db:test                    # pgTAP (supabase/tests/*.test.sql)
bun run check:db                   # db:reset + db:test — obligatorio si tocaste supabase/migrations
bun run db:types                   # regenera supabase/functions/_shared/database.types.ts
```
En **Estructura clave**, dentro de `supabase/`, agregar `tests/                   # pgTAP, un archivo por migración` y `config.toml` y bajo `functions/_shared/` agregar `database.types.ts    # generado por db:types; NO editar a mano`.
En **Supabase / Postgres — reglas**, cambiar la línea de tipos generados a: ``Tipos generados: `bun run db:types` después de cada migración → `supabase/functions/_shared/database.types.ts` (única fuente; la app lo re-exporta). El test `parsers/db-enums.test.ts` falla en compilación si los enums divergen de `types.ts`.`` y agregar: ``Categorías por defecto: `categories.user_id IS NULL`, sembradas por **migración** (existen en prod), no por `seed.sql`.`` (reemplazando la mención a seed.sql). Agregar la regla: ``Qué cuenta como gasto se define UNA vez en la vista `public.spending_transactions`; las RPC la usan. No repetir el filtro en la app.``

- [ ] **Step 5: Marcar el Plan 2 en el roadmap y verificar**

En el roadmap, fila del Plan 2: `Pendiente` → `Ejecutado`, y agregar el nombre del archivo del plan en la celda del nombre como en la fila del Plan 1.
Run: `bun run check && bun run check:db`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/database.types.ts supabase/functions/_shared/parsers/db-enums.test.ts supabase/functions/deno.json CLAUDE.md docs/superpowers/plans/2026-09-17-roadmap.md
git commit -m "feat(db): generate database types and enforce enum parity with parser types" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Aplicar el esquema al proyecto remoto

**Files:** ninguno nuevo (solo verificación). Usa `SUPABASE_DB_URL` de `.env.local`.

**Interfaces:**
- Produces: el proyecto `ptmtrbkuwszjxxdnjnwf` con las 7 migraciones aplicadas y registro público apagado. Plan 3 despliega Edge Functions sobre él.

- [ ] **Step 0: Confirmación humana**

Este paso escribe en el proyecto remoto del usuario. El ejecutor **debe** detenerse y pedir confirmación explícita antes del Step 3 si no la tiene ya en la conversación.

- [ ] **Step 1: Dry run contra el remoto**

Run (Git Bash; la URL se lee del archivo, nunca se pega en el reporte):
```bash
set -a; source .env.local; set +a
bunx supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
```
Expected: lista las 7 migraciones a aplicar y no aplica nada. Si falla la conexión con el host `db.<ref>.supabase.co` (IPv6), usar `"$DIRECT_URL"` (pooler en modo sesión, puerto 5432) en su lugar.

- [ ] **Step 2: Verificar que las extensiones existen en el remoto**

`pg_cron` y `pg_net` requieren estar habilitadas en el plan del proyecto; `create extension` funciona en Supabase hosted. Si el dry run no lo detecta, el push real lo hará: si `create extension pg_cron` falla, habilitarla desde el dashboard (Database → Extensions → `pg_cron`, `pg_net`) y repetir el push.

- [ ] **Step 3: Push real** (tras confirmación)

```bash
bunx supabase db push --db-url "$SUPABASE_DB_URL"
```
Expected: `Applying migration ...` × 7, `Finished supabase db push`.

- [ ] **Step 4: Verificar tipos idénticos entre local y remoto**

```bash
bunx supabase gen types --lang typescript --db-url "$SUPABASE_DB_URL" --schema public > "$TEMP/remote.types.ts"
diff <(sed 's/\r$//' supabase/functions/_shared/database.types.ts) <(sed 's/\r$//' "$TEMP/remote.types.ts") && echo "IDENTICOS"
```
Expected: `IDENTICOS`. Si difieren, el remoto tiene algo que local no (o viceversa): investigar antes de seguir; no regenerar el archivo local desde el remoto.

- [ ] **Step 5: Apagar el registro público en el remoto (manual)**

En el dashboard de Supabase: **Authentication → Sign In / Providers → Email**: desactivar "Allow new users to sign up" y confirmar. No se puede hacer desde la CLI sin `supabase login`. Anotar en el reporte que se hizo (o que queda pendiente para el usuario).

- [ ] **Step 6: Registrar en el roadmap**

En la fila del Plan 2 del roadmap, agregar a la celda "Entrega": `Aplicado al remoto ptmtrbkuwszjxxdnjnwf el <fecha>.`
```bash
git add docs/superpowers/plans/2026-09-17-roadmap.md
git commit -m "docs: record remote schema deployment" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Criterio de éxito del Plan 2

- `bun run check:db` verde desde cero: 7 migraciones aplican en local y los 8 archivos pgTAP pasan.
- `bun run check` verde (incluye el test de paridad de enums).
- Un usuario autenticado solo ve sus filas en todas las tablas; `anon` no ve nada; el service role puede escribir `linked_accounts`, `sync_logs`, `unparsed_emails`, `budget_alerts` y transacciones `email`.
- `get_spending_summary('week')` y `get_history('month', ...)` devuelven totales correctos en DOP con conversión USD y límites de semana en hora dominicana.
- Esquema aplicado al remoto con tipos idénticos a local; registro público apagado.

## Fuera de este plan

- Cron `sync-mail`, secretos de Vault (`project_url`, keys), Edge Functions → Plan 3.
- Emparejamiento de reversas (lógica de `sync-mail`) → Plan 3; el índice `transactions_reversal_match_idx` ya lo soporta.
- Presupuesto compartido en pareja (`budget_members`) → v2; el modelo no lo impide.
- Datos de prueba locales (`seed.sql`) → se agregan cuando la app (Plan 4) los necesite.
