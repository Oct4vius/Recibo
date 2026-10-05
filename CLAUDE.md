# Gastos App — Tracker de consumo bancario por correo

App móvil (Android; iOS diferido) fuera de tiendas, con registro abierto y
confirmación por correo; pensada para un grupo pequeño. Vincula cuentas
Gmail/Outlook, detecta correos de consumo de bancos dominicanos (BHD,
Banreservas, Popular, APAP) y lleva el gasto semanal/mensual con presupuesto,
categorías e historial. Alcance completo y decisiones en
[`docs/ALCANCE.md`](docs/ALCANCE.md) — leerlo antes de proponer features o
cambiar arquitectura. Lo que está en "Fuera de alcance" no se implementa aunque
parezca fácil.

## Stack
- **Runtime / Package Manager**: Bun (`bun install`, `bun add`, `bunx expo ...` — **NUNCA** npm/yarn/npx)
- **Móvil**: Expo (managed) + Expo Router (file-based), React Native, TypeScript strict. **Solo Android en v1**; no agregar config ni código específico de iOS
- **Distribución**: APK por EAS Build (plan gratuito), instalado a mano. Sin tiendas
- **UI**: NativeWind (Tailwind para RN), iconos `@expo/vector-icons`
- **Datos en la app**: TanStack Query + `@supabase/supabase-js`; sesión en `expo-secure-store`
- **Backend**: Supabase — Postgres (RLS), Auth (email + password), Edge Functions (Deno), `pg_cron` + `pg_net`, Vault
- **Push**: `expo-notifications` + Expo Push Service (gratis)
- **OAuth correo**: `expo-auth-session` (PKCE) → Edge Function intercambia el código
- **Idioma**: UI en español, código/variables/commits en inglés
- **Correo de Auth**: SMTP propio en plan gratuito (confirmación y recuperación por código)
- **Costo**: todo dentro del plan gratuito de Supabase y Expo. No agregar servicios pagos sin discutirlo.

## Comandos
```bash
bun install
bun run typecheck                  # tsc --noEmit (scripts, tests y código fuente de parsers)
bun run test                       # Vitest (tests/unit)
bun run test:deno                  # deno test --allow-read supabase/functions/
bun run lint                       # deno lint (Plan 4 agrega ESLint de Expo)
bun run check                      # typecheck + test + test:deno + lint — obligatorio antes de done
bun run fixtures:build             # fixtures-raw/**/*.eml → parsers/<bank>/fixtures/*.json
bun run db:start                   # stack local (Docker Desktop debe estar corriendo)
bun run db:reset                   # aplica migraciones + seed.sql en local
bun run db:test                    # pgTAP (supabase/tests/*.test.sql)
bun run check:db                   # db:reset + db:test — obligatorio si tocaste supabase/migrations
bun run db:types                   # regenera supabase/functions/_shared/database.types.ts
# Desde Plan 3: supabase functions serve
# Desde Plan 4: bunx expo start
```

## Estructura clave
```
app/                       # Expo Router: solo routing + layout, sin lógica
  (auth)/                  # login, register, reset
  (tabs)/                  # home, transactions, history, budget, settings
src/
  features/<dominio>/      # auth, accounts, transactions, budgets, history, categories
    api.ts                 #   queries/mutations (TanStack Query + supabase)
    components/            #   UI del dominio
    hooks.ts
  components/              # UI genérica (Button, Card, Amount, ...)
  lib/                     # supabase.ts, queryClient.ts, env.ts, money.ts, dates.ts
  types/                   # tipos compartidos; database.ts re-exporta _shared/database.types.ts (Plan 4)
supabase/
  migrations/              # SQL versionado, una migración por cambio
  seed.sql                 # solo datos de desarrollo local (las categorías van en migraciones)
  tests/                   # pgTAP, un archivo por migración
  config.toml
  functions/
    _shared/
      database.types.ts    # generado por db:types; NO editar a mano
      parsers/             # types.ts, normalize.ts, index.ts (registro), candidates.ts,
                           #   <bank>/index.ts + <bank>/<template>.ts + <bank>/fixtures/*.json
      mail/                # gmail.ts, graph.ts (fetch de correos, refresh de tokens)
      db.ts                # service client
    link-account/          # intercambia código OAuth → guarda refresh token en Vault
    sync-mail/             # invocada por pg_cron; lee correos, parsea, upsert, alertas
    send-push/             # envía a Expo Push Service
tests/unit/                # Vitest para src/ (espeja la ruta)
fixtures-raw/<bank>/       # .eml reales anonimizados, SOLO locales (gitignored); fuente de las fixtures
docs/
```

## Variables de entorno
La app solo ve variables `EXPO_PUBLIC_*` y **todas** pasan por el schema de
`src/lib/env.ts` (zod). Nunca leer `process.env` fuera de ese archivo.
```ts
// CORRECTO
import { env } from '@/lib/env';
createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// INCORRECTO
process.env.EXPO_PUBLIC_SUPABASE_URL   // ← NO usar directo
```
Secretos (client secrets de Google/Microsoft, service role key, Expo access
token) viven **solo** en Edge Functions vía `Deno.env.get(...)` y en
`supabase secrets set`. Si un secreto aparece en `app/` o `src/`, es un bug.

## Seguridad — reglas duras
- **Tokens de correo nunca tocan el dispositivo.** La app recibe solo el
  `authorization code` (PKCE) y lo manda a `link-account`. El refresh token se
  guarda en Supabase Vault (`vault.create_secret`) y solo lo lee `sync-mail`
  con service role. Si una PR guarda un token en `linked_accounts` en claro, en
  SecureStore o en logs → rechazar.
- **Registro abierto con confirmación por correo** (decidido 2026-10-05). Signup
  habilitado en Supabase Auth con "Confirm email" activo. La app tiene pantalla
  de registro (`signUp()`) y confirma con el **código de 6 dígitos** del correo
  (`verifyOtp({ type: 'email' })`), sin deep links ni página web; la
  recuperación de contraseña usa el mismo mecanismo (`type: 'recovery'`).
  Requiere SMTP propio: el SMTP integrado de Supabase solo entrega al equipo del
  proyecto. Anonymous sign-ins siempre apagados. **Nunca** desactivar la
  confirmación de correo para "destrabar" el registro. El aislamiento entre
  usuarios lo garantiza RLS, no el registro.
- **RLS en todas las tablas** con policy `user_id = auth.uid()`. Nueva tabla
  sin RLS = migración incompleta.
- La app usa **anon key**; las Edge Functions usan **service role**. Jamás al revés.
- Scopes OAuth mínimos y de solo lectura: `gmail.readonly`; `Mail.Read offline_access`.
- Desvincular una cuenta = revocar token en el proveedor + `vault` secret
  borrado + `linked_accounts.status = 'revoked'`. Las transacciones ya
  importadas se conservan.

## Parsers de correos bancarios
Funciones puras en `supabase/functions/_shared/parsers/`. **Sin** APIs de Deno,
sin fetch, sin fechas relativas a `Date.now()` (la fecha viene del correo).

### Contrato
```ts
export interface RawEmail {
  messageId: string;      // id del proveedor, único por cuenta
  from: string;           // dirección del remitente
  subject: string;
  text: string;           // cuerpo en texto plano, ya normalizado (ver normalize.ts)
  receivedAt: string;     // ISO, fallback si el correo no trae fecha
}

export type TxType = 'card_purchase' | 'card_reversal' | 'atm_withdrawal' | 'transfer_out';

export interface ParsedTransaction {
  bankCode: 'bhd' | 'banreservas' | 'popular' | 'apap';
  type: TxType;
  amount: number;         // positivo siempre, 2 decimales; el signo lo da `type`
  currency: 'DOP' | 'USD';
  merchant: string | null; // limpio; null si el banco no lo manda (reversas BHD)
  occurredAt: string;     // ISO con offset America/Santo_Domingo
  cardLast4?: string;
  reference?: string;     // número de confirmación (transferencias)
  counterpartyLast4?: string; // últimos 4 de la cuenta destino (transferencias)
  rowIndex: number;       // fila dentro del correo (0-based); parte del message_id
  templateId: string;     // '<bank>/<template>' para trazabilidad
}

// Una plantilla = un archivo. Un banco = lista de plantillas.
export interface Template {
  id: string;                                   // '<bank>/<template>'
  matches(email: RawEmail): boolean;            // normalmente por asunto
  parse(email: RawEmail): ParsedTransaction[];  // [] = no pudo extraer (→ unparsed_emails)
}
export interface BankParser {
  code: BankCode;
  senderDomains: string[];                      // minúsculas, sin '@'
  templates: Template[];
}

// El registro (parsers/index.ts) es lo único que sync-mail importa:
export type ParseResult =
  | { kind: 'parsed'; bankCode: BankCode; transactions: ParsedTransaction[] }
  | { kind: 'unparsed'; bankCode: BankCode }    // remitente de banco conocido o candidato, sin filas
  | { kind: 'unknown_sender' };                 // se descarta sin guardar
export function parseEmail(email: RawEmail): ParseResult;
```
Política **todo o nada** por correo: si una fila de la tabla no se puede mapear
(estado o tipo desconocido, fecha o monto inválidos), `parse()` devuelve `[]` y
el correo completo cae en `unparsed_emails`. Nunca se guardan filas parciales.

Fixtures derivadas: `parsers/<bank>/fixtures/<name>.json` con la forma exacta
de `RawEmail` (texto ya normalizado por `htmlToText`), generadas desde
`fixtures-raw/` con `bun run fixtures:build`.
### BHD — dos plantillas verificadas con `.eml` reales
Remitente único `Alertas@bhd.com.do`. La plantilla se elige por **asunto**:

**1. `bhd/transactions-table`** — asunto `BHD Notificación de Transacciones`.
Encabezado `Visa Débito Intl # 1234` (producto y últimos 4) y tabla
`Fecha | Moneda | Monto | Comercio | Estado | Tipo`, ej.
`16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra`.
Moneda en columna aparte (`RD` → `DOP`); monto `$275.72`. Fecha
`dd/mm/yyyy hh:mm am|pm` en minúsculas. Puede traer **varias filas**; cada fila
es una transacción con `message_id = <messageId>#<rowIndex>`.
Mapeo `Estado + Tipo`:
- `Aprobada` + `Compra` → `card_purchase`.
- `Reversada` + `Compra` → `card_reversal`, **comercio vacío** (`merchant: null`).
- `Aprobada` + `Retiro` → `atm_withdrawal`. **Reportado por el usuario, sin
  fixture aún**: no codificar hasta tener el `.eml`.
- Cualquier otro valor → `parse()` devuelve `[]` → `unparsed_emails`.

**2. `bhd/transfer`** — asunto `Transacciones entre productos BHD y a otros Bancos`.
Tabla clave-valor: `Producto origen`, `Producto destino` (cuentas enmascaradas
`DO..BCBH...XXXXXXX0099`), `Descripción` (puede venir vacía), `Monto`
(`RD$ 3,500.00`: **moneda como prefijo y separador de miles**, distinto a la
plantilla 1), `Beneficiario` (`GOMEZ PEÑA, MARIA`), `Número de confirmación`,
`Fecha y hora de la transacción` (`16/09/2026 - 9:53 AM`: **guion, sin cero
inicial, AM/PM en mayúsculas**, distinto a la plantilla 1), `Tipo de transacción`.
→ `transfer_out` con `merchant = beneficiario`, `reference = número de
confirmación`, `counterpartyLast4 = últimos 4 del producto destino`.
Origen y destino pueden ser ambos BHD (`BCBH`): una transferencia a una cuenta
propia también genera este correo. Se resuelve con categorías que no cuentan
como gasto (ver Categorías), no en el parser.

Detalles técnicos comunes:
- `multipart/related` o `multipart/mixed`; HTML en `quoted-printable` UTF-8.
  `_shared/mail/` decodifica; el parser recibe texto plano normalizado.
- Las fechas del cuerpo son hora local dominicana **sin** zona →
  `America/Santo_Domingo` (UTC-4). El header `Date` (UTC) es fallback.
- El logo llega como adjunto (`cid:img1`) y se ignora.

### Reversas en `sync-mail`
Caso real: compra `Aprobada $438.42` y `Reversada $434.22` en el mismo minuto,
misma tarjeta. **Los montos no coinciden** (fixtures
`card-purchase-approved-near-reversal.eml` y `card-purchase-reversed.eml`).
Por eso:
La tabla impone `transactions_ignored_reason_shape`: `is_ignored = false` ⇒
`ignored_reason is null`, e `is_ignored = true` ⇒ `ignored_reason is not null`
(enum `ignored_reason`: `user`, `reversed`, `unmatched_reversal`). Siempre se
cambian juntos.
1. Buscar `card_purchase` **con `is_ignored = false`** (una compra que el usuario
   ya ignoró, o ya reversada, no es candidata) del mismo usuario, `bank_code`,
   `card_last4`, `currency` y **monto exacto**, dentro de las 72 h previas.
2. Si existe: la reversa se inserta con `is_ignored = true`,
   `ignored_reason = 'reversed'` y `reversed_by = null`; la compra pasa a
   `is_ignored = true`, `ignored_reason = 'reversed'` y
   `reversed_by = <id de la reversa>`. Gasto neto cero. El emparejamiento se
   apoya en `reversed_by`, no en `ignored_reason`: el usuario puede asignarse
   `ignored_reason` a mano.
3. Si **no** existe: la reversa se guarda con `is_ignored = true`,
   `ignored_reason = 'unmatched_reversal'` y `reversed_by = null`. **No se resta
   del total** (la compra original pudo no llegar por correo; restarla
   subestimaría el gasto). Aparece en el filtro "Revisar" y el usuario decide.
4. Nunca emparejar por monto aproximado. Test de regresión obligatorio: el par
   de fixtures de arriba **no** debe emparejarse.

`fixtures-raw/` guarda los `.eml` reales anonimizados tal como llegan y **no se
versiona** (`.gitignore`; el repo es público y los headers traen rutas, IPs e ids
reales). Vive solo en la máquina del desarrollador. Las fixtures de test en
`parsers/<bank>/fixtures/` se derivan de ahí (texto plano normalizado) con el
script `bun run fixtures:build` y **sí** se versionan: son la fuente de los tests
en un clon limpio. Los tests que leen `.eml` directamente usan
`it.skipIf(!existsSync(...))`. Nunca editar una fixture derivada a mano.

El registro en `parsers/index.ts` resuelve `from → banco → parse()`. Si el
banco es conocido y `parse()` devuelve `[]`, `sync-mail` inserta en
`unparsed_emails` (subject + primeros 500 chars). **Nunca adivinar un monto ni
inventar un parser sin correo real.**

**Estado de los bancos:**
- `bhd`: parser en v1. Único correo verificado.
- `banreservas`, `popular`, `apap`: **candidatos sin parser**. Solo se registran
  sus dominios probables en `parsers/candidates.ts` con `status: 'candidate'`
  para que sus correos caigan en `unparsed_emails` y sirvan de muestra. No
  escribir `parse()` para ellos hasta tener un correo real en `fixtures/`.
- Fixtures transcritas de una captura de pantalla llevan sufijo
  `.provisional.txt`. Al llegar el `.eml` real se agrega como fixture nueva; la
  provisional se conserva y ambas deben pasar.

### Checklist para agregar banco o plantilla
1. Guardar el `.eml` real anonimizado en `fixtures-raw/<bank>/<caso>.eml`
   (últimos 4 de tarjeta → `1234`, nombres → `JUAN PEREZ`, cuentas y números de
   confirmación alterados; montos y fechas reales se conservan). Correr
   `bun run fixtures:build` → genera `parsers/<bank>/fixtures/<caso>.json`.
2. Escribir el test **antes** del regex: `<template>.test.ts` carga la fixture
   JSON y asserta la lista exacta de `ParsedTransaction`.
3. Implementar la plantilla. Los montos dominicanos vienen como `RD$ 1,234.56`
   o `US$ 12.00`; usar `parseAmount()` de `_shared/parsers/normalize.ts`, no
   regex ad hoc.
4. Si el banco es nuevo: agregar `senderDomains` y registrarlo en `parsers/index.ts`.
5. Correr `bun run test:deno`.
6. Si el banco cambió su plantilla: **agregar** fixture nueva, no editar la vieja.
   Las dos deben seguir pasando.

## Sync (`sync-mail`)
- Disparado por `pg_cron` cada 15 min vía `pg_net` con header
  `Authorization: Bearer <service_role>`. Rechazar cualquier otro caller.
- Por cuenta: refresh token → fetch incremental con cursor
  (`linked_accounts.sync_cursor`: Gmail `historyId`, Outlook `@odata.deltaLink`)
  → parse → `upsert` en `transactions` con `onConflict: 'linked_account_id,message_id'`.
  La clave es un `UNIQUE` plano (`transactions_account_message_key`), no un índice
  parcial: `supabase-js` lo infiere y los gastos manuales (NULL/NULL) nunca chocan.
- **Idempotente siempre.** Reintentar una corrida no puede duplicar ni alterar
  transacciones editadas por el usuario: el upsert usa `ignoreDuplicates: true`
  y solo escribe si la fila no existe.
- La única dedup en v1 es por `message_id`. **No** implementar dedup
  autorización/liquidación hasta que una fixture real lo demuestre necesario.
- Cada corrida escribe una fila en `sync_logs` (`fetched`, `parsed`, `unparsed`,
  `error`). Un error en una cuenta **no** aborta las demás.
- Al final evalúa presupuestos: umbrales 80 y 100 %; `budget_alerts` evita
  re-notificar el mismo `(budget_id, period_start, threshold)`.

## Supabase / Postgres — reglas
- **Dinero**: `numeric(14,2)`, nunca `float`. Las sumas se hacen en SQL, no en JS.
- **Fechas**: `timestamptz`. Los límites de semana/mes se calculan en la zona
  del usuario (`profiles.timezone`, default `America/Santo_Domingo`). Semana
  empieza **lunes**.
- **Agregados (home, historial, presupuesto) → RPC SQL**, no traer filas y sumar
  en el cliente. Ej.: `get_spending_summary(period, ref_date)`,
  `get_history(granularity, from, to)`.
- **PostgREST recorta a 1000 filas** silenciosamente. Listados de
  `transactions` siempre paginados con `.range()` + `count: 'exact'`.
  Nunca asumir que `.select('*')` devuelve todo.
- Tipos generados: `bun run db:types` después de cada migración →
  `supabase/functions/_shared/database.types.ts` (única fuente; la app lo
  re-exporta). El test `parsers/db-enums.test.ts` falla en compilación si los
  enums divergen de `types.ts`. No escribir tipos de tablas a mano.
- Categorías por defecto: `categories.user_id IS NULL`, sembradas por
  **migración** (existen en prod), no por `seed.sql`. No editables por el
  usuario (puede crear las suyas).
- Qué cuenta como gasto se define UNA vez en la vista
  `public.spending_transactions`; las RPC la usan. No repetir el filtro en la app.
- La conversión USD→DOP para totales vive en `spending_transactions.amount_dop`
  (una sola fórmula); las RPC suman esa columna.
- `transactions`: las columnas de identidad (`user_id`, `source`, `message_id`,
  `linked_account_id`, `bank_code`, `template_id`) son inmutables; un trigger
  `before update` lanza 42501 (migración `transactions_immutable_columns`). Los
  correos importados nunca se borran (solo se borran las manuales).
- `unparsed_emails`: el usuario solo puede actualizar `resolved` (privilegio por
  columna); el resto lo escribe `sync-mail` con service role.
- `categories.counts_as_spending boolean default true`. La categoría por defecto
  **"Transferencias propias"** tiene `false`: una `transfer_out` a una cuenta
  propia se asigna ahí vía `merchant_rules`: `match_field = 'merchant'` (default;
  `pattern` es un substring del comercio/beneficiario) o
  `match_field = 'counterparty_last4'` (`pattern` = exactamente 4 dígitos, validado
  por CHECK). **No suma** a totales ni presupuesto, pero sigue
  visible. Todas las RPC de agregados filtran `counts_as_spending = true` y
  `is_ignored = false`. Esta es la única forma de excluir un gasto además de
  ignorarlo.

## Principios de diseño — SOLID y DRY, siempre
Se aplican en app, Edge Functions y SQL. Así se traducen a este proyecto:

- **S — una responsabilidad por módulo.** Un parser por plantilla
  (`bhd/transactions-table.ts`, `bhd/transfer.ts`); el cliente de correo solo
  trae y decodifica correos; `sync-mail` solo orquesta (fetch → parse → persist
  → alertas) y no contiene regex ni SQL inline; las pantallas solo componen.
  Si un archivo hace dos de estas cosas, se divide.
- **O — abierto a extensión, cerrado a modificación.** Agregar un banco o
  plantilla es **crear un archivo y registrarlo** en `parsers/index.ts`. Nunca
  una cadena de `if (bank === 'bhd')` en el orquestador. Lo mismo para
  proveedores de correo: `mail/gmail.ts` y `mail/graph.ts` se registran, no se
  ramifican.
- **L — todo parser y todo proveedor es intercambiable.** Cumplen el mismo
  contrato (`parse(RawEmail): ParsedTransaction[]`,
  `MailProvider.fetchNew(cursor): Page<RawEmail>`) y el orquestador no sabe
  cuál tiene enfrente. Un test genérico recorre todos los parsers registrados
  y valida el contrato.
- **I — interfaces pequeñas.** `MailProvider` expone solo `fetchNew` y
  `refreshToken`; `TransactionRepository` solo `upsertMany`, `findReversalMatch`,
  `logSync`. Nada de pasar el cliente de Supabase entero a quien solo inserta.
- **D — depender de abstracciones.** `sync-mail` recibe `MailProvider` y
  `TransactionRepository` por parámetro (inyección simple en el handler); los
  tests le pasan implementaciones en memoria. Ni Gmail ni Supabase se importan
  dentro de la lógica de negocio.
- **DRY — una sola fuente para cada regla.** Montos: `parseAmount()` y
  `formatMoney()`; fechas dominicanas: `parseLocalDate()` en `normalize.ts` y
  `dates.ts`; tipos de DB: generados, nunca a mano; queries de agregados: RPC,
  no reimplementadas en JS; `queryKeys` centralizadas por feature. Si el mismo
  regex o la misma fórmula aparece dos veces, se extrae.
- **DRY no es abstracción prematura.** Dos plantillas que se parecen no se
  fusionan hasta que haya una tercera (regla de tres). Preferir duplicación
  pequeña y clara a una abstracción con flags.

## Convenciones de la app
- `app/` solo enruta y compone; la lógica vive en `src/features/<dominio>`.
- Toda lectura remota pasa por TanStack Query con keys en
  `src/features/<dominio>/keys.ts`. Mutaciones invalidan sus keys; no se
  actualiza estado local a mano.
- Montos se muestran con `formatMoney(amount, currency)` de `src/lib/money.ts`
  (`RD$ 1,234.56`, `US$ 12.00`). USD se convierte a DOP con
  `profiles.usd_rate` **solo** para totales consolidados; la transacción
  conserva su moneda.
- Textos de UI en español, sin i18n. Sin `console.log` en código de producción.
- Componentes funcionales, hooks, sin clases. Un componente por archivo.

## Testing — política
Estricto donde duele, ligero donde no. La lógica de dinero, fechas, parsers y
SQL nace con tests. Las pantallas no se testean en v1.

- **App**: Vitest en `tests/unit/**/*.test.ts` **solo** para lógica pura:
  `src/lib/money.ts`, `src/lib/dates.ts`, transformaciones en
  `features/*/api.ts`. **No** escribir tests de componentes ni pantallas: no
  instalar `@testing-library/react-native`.
- **Edge Functions y parsers**: `deno test`, junto al código. Aquí sí es estricto.
- **Parsers**: una fixture real por plantilla, sin excepciones (ver checklist).
- **DB**: cambio en RLS, RPC, trigger o migración → test pgTAP en
  `supabase/tests/*.test.sql` o test de integración contra `supabase start`.
  Los mocks no cazan bugs de schema.
- **Regresión**: cada bug fix trae un test que **falla sin el fix**, nombrado
  `describe("regression #<issue> — <qué>")`.
- **Antes de done**: `bun run check` (typecheck + test + test:deno + lint) y, si el
  cambio toca `supabase/migrations/` o `supabase/tests/`, también `bun run check:db`
  (reset local + pgTAP; necesita Docker).

### Definition of Done
- El cambio trae **sus** tests en el mismo PR — nunca "los agrego después".
- Respeta SOLID y DRY (sección "Principios de diseño"): sin ramas por banco en
  el orquestador, sin regex ni fórmulas de dinero duplicadas, dependencias
  inyectadas en la lógica de negocio.
- Nueva tabla → migración + RLS + tipos regenerados.
- Nuevo parser/plantilla → fixture + test + registrado.
- Sin secretos ni tokens en `app/`, `src/` ni logs.
- Typecheck, lint y tests en verde; `bun run check:db` en verde si cambió
  `supabase/migrations/` o `supabase/tests/`.

## Restricciones conocidas (no "arreglar")
- **Google OAuth**: app publicada "En producción" **sin verificar** (pantalla de
  advertencia, máx. 100 usuarios). En modo "Testing" los refresh tokens caducan
  a los 7 días. No intentar pasar verificación de Google para v1.
- **Supabase free** pausa proyectos tras 7 días sin actividad. Si pasa, la app
  muestra estado "backend pausado" en cuentas vinculadas; no reintentar en loop.
- **Fuera de alcance v1** (no implementar aunque parezca fácil): iOS,
  dedup autorización/liquidación, tests de UI, IMAP, parseo con LLM,
  ingresos, versión web, tasa de cambio automática, multi-idioma.
- **No bloquear v2**: presupuesto compartido en pareja. `budgets` y
  `transactions` se relacionan por `user_id`; una futura `budget_members` debe
  poder agregarse sin migrar datos. No diseñar nada que lo impida.
