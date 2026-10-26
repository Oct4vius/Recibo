# Gastos App — Tracker de consumo bancario por correo

App móvil privada (Android; iOS diferido) para tres usuarios. Vincula cuentas
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
- **Avisos**: `expo-notifications` solo locales + `expo-background-task`/`expo-task-manager` (sin Firebase ni Expo Push)
- **OAuth correo**: Outlook con `expo-auth-session` (PKCE); Gmail con `@react-native-google-signin/google-signin`
  (`serverAuthCode`) → `link-account` intercambia el código en el servidor
- **Idioma**: UI en español, código/variables/commits en inglés
- **Costo**: todo dentro del plan gratuito de Supabase y Expo. No agregar servicios pagos sin discutirlo.

## Comandos
```bash
bun install
bun run typecheck                  # tsc --noEmit (app, src, scripts, tests y código fuente de parsers)
bun run test                       # Vitest (tests/unit)
bun run test:deno                  # deno test --allow-read supabase/functions/
bun run lint                       # deno lint (supabase/functions) + expo lint (app)
bun run check                      # typecheck + test + test:deno + lint — obligatorio antes de done
bun run fixtures:build             # fixtures-raw/**/*.eml → parsers/<bank>/fixtures/*.json
bun run db:start                   # stack local (Docker Desktop debe estar corriendo)
bun run db:reset                   # aplica migraciones + seed.sql en local
bun run db:test                    # pgTAP (supabase/tests/*.test.sql)
bun run check:db                   # db:reset + db:test — obligatorio si tocaste supabase/migrations
bun run db:types                   # regenera supabase/functions/_shared/database.types.ts
bun run functions:serve            # Edge Functions locales con supabase/functions/.env (plantilla .env.example)
bun run dev:link-outlook [--target local|remote]  # vincula una cuenta Outlook desde la terminal (dev)
bun run dev:link-gmail [--target local|remote]    # vincula una cuenta Gmail desde la terminal (dev)
bun run dev:sync [--target local|remote]          # dispara sync-mail a mano (en local no hay cron)
bun run dev:download-eml --account <correo> [--target local|remote] [--all]  # baja el MIME de los correos sin procesar
bun run eml:anonymize <entrada.eml> <salida.eml>  # anonimiza un .eml (config local gitignored); ver docs/agregar-banco.md
bun run start                      # Expo; requiere .env.local con EXPO_PUBLIC_*. Desde el 3a se prueba en la build
                                   #   de desarrollo (Expo Go ya no sirve para vincular: el retorno OAuth usa el esquema propio)
bunx eas-cli build --profile development --platform android   # APK de desarrollo; --profile preview = APK de prueba
bunx eas-cli build --profile production --platform android    # APK final (1.0.0)
bun run verify:bundle              # empaqueta Android sin dispositivo (verificación de Metro/Babel/NativeWind)
```
Pins por compatibilidad (no "actualizar" a ciegas): TypeScript `~6.0` (typescript-eslint, que usa
`eslint-config-expo`, aún no soporta TS 7) y ESLint `^9` (`eslint-plugin-react` falla con ESLint 10).
`tsconfig.json` usa `"types": ["node", "expo/types"]`: todo `@types/*` nuevo debe agregarse ahí.

## Estructura clave
```
index.ts                   # entrada (`main`): define la tarea en segundo plano antes de `expo-router/entry`
app/                       # Expo Router: solo routing + layout, sin lógica
  dev/gallery.tsx          # galería de componentes, solo __DEV__
  (auth)/                  # login (registro cerrado: sin register ni reset)
  (tabs)/                  # home, transactions, history, budget, settings
src/
  features/<dominio>/      # auth, accounts, transactions, budgets, history, categories, rules, settings, summary, profile
    api.ts                 #   queries/mutations (TanStack Query + supabase)
    components/            #   UI del dominio
    hooks.ts
  components/              # UI genérica (Button, Card, Amount, ...)
  lib/                     # supabase.ts, queryClient.ts, env.ts, money.ts, dates.ts
  theme/                   # tokens.ts + colors.json (paleta única), motion*, ransom, shapes, progress, backdrops
                           #   (progress.ts calcula el % de presupuesto en centavos enteros)
  features/notifications/  # avisos locales: text, mapping, state (puro), flows (puerto inyectado), api, native-port,
                           #   background (tarea), hooks, components/ (Vitest solo sobre la parte pura)
  features/rates/          # texto de tasas (`≈ RD$ …`, última tasa) y consulta de la última tasa del BCRD
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
      mail/                # types.ts (contrato MailProvider + SyncCursor), oauth.ts, cursor.ts, graph.ts,
                           #   microsoft-auth.ts, gmail.ts, google-auth.ts, base64url.ts, sender-query.ts, registry.ts
      sync/                # sync-account.ts (orquestación), repository.ts + supabase-repository.ts, rows.ts
      rates/               # types.ts, normalize.ts (parseRate/toUsdRates), bcrd.ts (lector) + xlsx.ts (zip/XML mínimo),
                           #   repository.ts + supabase-repository.ts, fixtures/ (archivo real del BCRD)
      db.ts                # service client
      http.ts              # respuestas JSON y errores comunes de las funciones
    link-account/          # intercambia el código OAuth → refresh token a Vault; handler.ts + exchangers.ts (uno por proveedor) + index.ts
    unlink-account/        # desvincula (secreto de Vault borrado, status = 'revoked')
    sync-mail/             # invocada por pg_cron; lee correos, parsea, ingesta, registra
    fetch-usd-rates/       # invocada por pg_cron; lee la tasa de venta del BCRD y la guarda en usd_rates
                           #   (cada función: handler.ts testeable con dependencias inyectadas + index.ts delgado)
scripts/                   # herramientas de desarrollo (Bun); scripts/lib/{loopback,google-login,dev-session,anonymize,raw-mail}.ts
tests/unit/                # Vitest para src/ (espeja la ruta)
fixtures-raw/<bank>/       # .eml reales anonimizados, SOLO locales (gitignored); fuente de las fixtures
docs/                      # ALCANCE.md, agregar-banco.md (receta para bancos y plantillas nuevos)
```

## Variables de entorno
La app solo ve variables `EXPO_PUBLIC_*` y **todas** pasan por el schema de
`src/lib/env.ts` (zod; `EXPO_PUBLIC_MS_CLIENT_ID` se valida con `z.guid()`). Nunca leer `process.env` fuera de ese archivo.
```ts
// CORRECTO
import { env } from '@/lib/env';
createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// INCORRECTO
process.env.EXPO_PUBLIC_SUPABASE_URL   // ← NO usar directo
```
Secretos (client secret de Google, service role key, Expo access
token, `SYNC_MAIL_SECRET`, `FETCH_USD_RATES_SECRET`) viven **solo** en Edge Functions vía `Deno.env.get(...)` y en
`supabase secrets set`. Si un secreto aparece en `app/` o `src/`, es un bug.
Las funciones usan `MS_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SYNC_MAIL_SECRET` y `FETCH_USD_RATES_SECRET`
(local en `supabase/functions/.env`, plantilla `.env.example`; gitignored). Microsoft es cliente público + PKCE: **sin**
client secret. `EXPO_PUBLIC_MS_CLIENT_ID` es el mismo id, público. Google: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` son
del cliente **Web** de Google Cloud; `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (público, en el schema) es ese mismo id. Los
scripts de desarrollo leen los secretos de `supabase/functions/.env` (`functionsEnv()`). `fetch-usd-rates` usa
`FETCH_USD_RATES_SECRET` (propio, no el de `sync-mail`); la fuente del BCRD es pública y no necesita token.

## Seguridad — reglas duras
- **Tokens de correo nunca tocan el dispositivo.** La app recibe solo el
  `authorization code` (PKCE) y lo manda a `link-account`. El refresh token se
  guarda en Supabase Vault (`vault.create_secret`) y solo lo lee `sync-mail`
  con service role. Si una PR guarda un token en `linked_accounts` en claro, en
  SecureStore o en logs → rechazar.
- **Registro cerrado.** Signup deshabilitado en Supabase Auth; los usuarios se
  crean desde el dashboard ("Create new user" + Auto Confirm). La app **no** tiene
  pantalla de registro ni llama a `signUp()`. Si aparece, es un bug. No hay SMTP
  propio (no hay dominio): sin invitaciones ni recuperación de contraseña por
  correo; la contraseña se cambia en la app con sesión abierta (`updateUser`) o
  la restablece el admin. El registro abierto se descartó el 2026-10-05 por eso.
- **Cambio de contraseña verificado en el servidor.** `changePassword` manda `current_password` (`passwordUpdate`),
  pero Auth solo lo exige con "Require current password when updating" encendido en el dashboard (Authentication →
  Providers → Email; `config.toml` no tiene esa clave). Con la opción apagada se ignora y basta con robar la sesión.
- **RLS en todas las tablas** con policy `user_id = auth.uid()`. Nueva tabla
  sin RLS = migración incompleta.
- La app usa **anon key**; las Edge Functions usan **service role**. Jamás al revés.
- Scopes OAuth mínimos y de solo lectura: `gmail.readonly`; `Mail.Read offline_access`.
- La app envía a `link-account` `{ provider: 'outlook', code, codeVerifier, redirectUri }` o `{ provider: 'gmail', code }` y
  **nunca** canjea el código. En Gmail la app solo lee `serverAuthCode` de `signIn()`: sin `getTokens`, sin `idToken`, sin
  `revokeAccess` (revocaría el permiso del servidor); `signOut` antes (selector de cuenta) y después de entregar el código.
  Un consentimiento sin `gmail.readonly` se rechaza al vincular (mensaje claro, la cuenta no queda activa).
- Desvincular una cuenta = `unlink_mail_account` (borra el secreto de Vault y pone
  `linked_accounts.status = 'revoked'`). Microsoft no permite revocar el token de una app en cuentas personales:
  la app indica revocar el acceso en account.live.com/consent. Google sí lo permite: `unlink-account` verifica que la
  cuenta es del usuario, lee el token y lo revoca en Google (best effort, con timeout; si falla igual desvincula) antes de
  `unlink_mail_account`. Las transacciones ya importadas se conservan.
- Borrar una fila de `linked_accounts` (o el usuario: cascada de `auth.users`) borra su secreto de Vault (trigger
  `linked_accounts_delete_vault_secret`). Aun así, desvincular antes de borrar un usuario: así también se revoca en Google.
- Las funciones SQL de Vault y vinculación (`initial_sync_cursor`, `link_mail_account`, `unlink_mail_account`,
  `mail_account_token`, `set_mail_account_token`) viven en `public` porque `supabase.rpc` solo alcanza esquemas
  expuestos. La protección es `EXECUTE` solo para `service_role` (pgTAP falla si `anon`/`authenticated` lo reciben).
  `set_mail_account_token` lanza P0002 si falta el secreto de Vault.

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
  senderAddresses: string[];                    // direcciones exactas que sync busca; vacía = no se busca
  templates: Template[];
  ignored: IgnoredEmail[];                      // se evalúan antes que las plantillas
}
/** Correo conocido del banco que no es un gasto (p. ej. transferencia recibida). */
export interface IgnoredEmail {
  id: string;                                   // '<bank>/<name>'
  matches(email: RawEmail): boolean;
}

// El registro (parsers/index.ts) es lo único que sync-mail importa:
export type ParseResult =
  | { kind: 'parsed'; bankCode: BankCode; transactions: ParsedTransaction[] }
  | { kind: 'unparsed'; bankCode: BankCode }    // remitente de banco conocido o candidato, sin filas
  | { kind: 'ignored'; bankCode: BankCode }     // correo conocido que no es gasto: se descarta sin guardar
  | { kind: 'unknown_sender' };                 // se descarta sin guardar
export function parseEmail(email: RawEmail): ParseResult;
```
Política **todo o nada** por correo: si una fila de la tabla no se puede mapear
(estado o tipo desconocido, fecha o monto inválidos), `parse()` devuelve `[]` y
el correo completo cae en `unparsed_emails`. Nunca se guardan filas parciales.

Fixtures derivadas: `parsers/<bank>/fixtures/<name>.json` con la forma exacta
de `RawEmail` (texto ya normalizado por `htmlToText`), generadas desde
`fixtures-raw/` con `bun run fixtures:build`.
### BHD — tres plantillas verificadas con `.eml` reales
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
- `Aprobada` + `Retiro de Efectivo` → `atm_withdrawal` (comercio tal cual, `BANCO BHD`).
- `Aprobada` + `Reserva de Fondos (Hold)` → `card_purchase`: el hold es el único aviso de
  ese gasto (suscripciones); en ~6 semanas de correo real nunca llegó una "Compra" después.
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

**3. `bhd/service-payment`** — asunto `Pago de Servicio e Impuestos`. Tabla clave-valor:
`Monto` (`RD$ 200`, sin decimales), `Proveedor del servicio` (`ALTICE MOVIL`),
`Número de confirmación`, `Fecha y hora de la transacción` (`04/09/2026 | 9:24 AM`:
**fecha y hora en celdas separadas, con `|`**). → una `transfer_out` con
`merchant = proveedor`, `reference = número de confirmación`, sin `counterpartyLast4` ni `cardLast4`.

**Ignorado `bhd/transfer-in`** — mismo asunto que la plantilla 2, pero con `Producto destino`
y **sin** `Producto origen` (transferencia recibida). Es un ingreso y v1 no los registra:
`parseEmail` devuelve `ignored` y el correo no se guarda en ningún lado.

**Ignorado `bhd/purchase-code`** — asunto `Código de validación de compra` (OTP de una compra). Solo lee
remitente y asunto; se prueba con un `RawEmail` mínimo hasta tener un `.eml` real.

Detalles técnicos comunes:
- `multipart/related` o `multipart/mixed`; HTML en `quoted-printable` UTF-8.
  `_shared/mail/` decodifica; el parser recibe texto plano normalizado.
- Las fechas del cuerpo son hora local dominicana **sin** zona →
  `America/Santo_Domingo` (UTC-4). El header `Date` (UTC) es fallback.
- El logo llega como adjunto (`cid:img1`) y se ignora.

### Reversas en `sync-mail`
El emparejamiento vive en SQL, en `ingest_transactions` (no en TypeScript). Procesa las filas por `occurred_at`
(compras antes que reversas con la misma marca de tiempo) y luego `message_id`; monto exacto; empareja con la compra
más cercana dentro de las 72 h. Funciona en las dos direcciones: una compra que llega después (otra página) busca la
reversa `unmatched_reversal` más cercana de las 72 h siguientes, con el mismo monto exacto. "Marcar como revisado" pone `transactions.reviewed_at` y saca la fila de "Revisar"
sin cambiar `ignored_reason` ni los totales.

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

`senderAddress()` toma la dirección real del `From` (RFC 5322): ignora frases entre comillas y comentarios, así un
`"<alertas@bhd.com.do>" <x@otro.example>` no pasa por BHD. `parseAmount()` devuelve null para 0 o montos que no
caben en `numeric(14,2)`. `htmlToText()` es una pasada lineal (sin regex globales sobre el HTML): un correo con miles
de `<` sin cerrar no puede frenar `sync-mail`; la prueba de regresión mide 200 KB de entrada hostil.

**Estado de los bancos:**
- `bhd`: parser en v1. Único correo verificado.
- `banreservas`, `popular`, `apap`: **candidatos sin parser**. Solo se registran
  sus dominios probables y, si se conoce, la dirección exacta del remitente (`senderAddresses`; sin dirección no se
  busca; APAP: `noreply@apap.com.do` visto) en `parsers/candidates.ts` con `status: 'candidate'`
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
4. Si el banco es nuevo: agregar `senderDomains` y `senderAddresses` y registrarlo en `parsers/index.ts`.
5. Correr `bun run test:deno`.
6. Si el banco cambió su plantilla: **agregar** fixture nueva, no editar la vieja.
   Las dos deben seguir pasando.

Receta completa con herramientas (descargar sin procesar, anonimizar, desplegar y reprocesar): `docs/agregar-banco.md`.

## Sync (`sync-mail`)
- Disparado por `pg_cron` cada 15 min (`invoke_sync_mail()`; URL y secreto en Vault: `sync_mail_url`,
  `sync_mail_secret`) con `Authorization: Bearer <SYNC_MAIL_SECRET>`. Rechazar cualquier otro caller.
  En local `seed.sql` no configura el cron (`invoke_sync_mail()` devuelve null sin esos valores): el sync se
  dispara con `bun run dev:sync`.
- Por cuenta (`syncAccount`): refresh token (el rotado se guarda **antes** de seguir; el chequeo de solape solo
  salta la corrida si otra corrida cambió el token) → `$filter` por direcciones exactas (`senderAddresses`) ordenado por `receivedDateTime` ascendente desde el cursor de fecha (KQL `$search` descartado: Graph ignora ahí el id inmutable)
  (`SyncCursor` JSON `{ since, next, maxSeen }` en `linked_accounts.sync_cursor`; lo crea `initial_sync_cursor` y lo
  avanza el proveedor; margen de 10 min, máx. 10 páginas por corrida, ids inmutables de Graph) → `parseEmail` →
  `ingest_transactions` (una transacción por página: inserta sin duplicar, empareja reversas por monto exacto,
  candado advisory por cuenta y página) → `unparsed_emails` → `sync_logs`. Primera importación: día 1 del mes anterior.
  El adaptador nunca escribe sobre una cuenta `revoked`.
- **Gmail** (`mail/gmail.ts`, mismo contrato `MailProvider`): `messages.list` con `q = from:(…) after:<epoch>` (las mismas
  `senderAddresses`, vía `bankSenderAddresses()`) e `includeSpamTrash=true`, luego `messages.get` `format=full` por id y la
  parte `text/html` (recorrido recursivo, charset del `Content-Type`, UTF-8 si no se conoce). Los ids de Gmail son estables
  (cambiar de etiqueta no duplica). Devuelve lo más nuevo primero: el cursor lo tolera (`since` fijo mientras hay `next`).
  403 `insufficientPermissions` → `MailAuthError` (volver a vincular); 403 de límite de tasa, 429 y 5xx → transitorio; un 404
  entre list y get se salta. El texto de "sesión expirada" lo da el registro por proveedor (`registry.ts`).
- `transactions` se escribe solo por `ingest_transactions`; la clave es el `UNIQUE` plano
  `transactions_account_message_key` (`linked_account_id, message_id`): los gastos manuales (NULL/NULL) nunca chocan.
- **Idempotente siempre.** Reintentar una corrida no puede duplicar ni alterar
  transacciones editadas por el usuario: solo se inserta si la fila no existe.
- La única dedup en v1 es por `message_id`. **No** implementar dedup
  autorización/liquidación hasta que una fixture real lo demuestre necesario.
- Cada corrida escribe una fila en `sync_logs` (`fetched`, `parsed`, `unparsed`,
  `error`). Un error en una cuenta **no** aborta las demás.
- **Un correo no bloquea la cuenta.** Si la base rechaza los datos de una página (`DataRejectedError`, SQLSTATE clase
  22 o 23), `syncAccount` reintenta correo por correo y guarda los rechazados como muestra en `unparsed_emails`; el
  cursor avanza. Cualquier otro error del repositorio reintenta la página entera en la próxima corrida.
- **Reparto entre cuentas.** `sync-mail` baraja las cuentas en cada corrida (`shuffled`) y no empieza cuentas nuevas
  después de 100 s (quedan `skipped`). Cada llamada a Google/Microsoft tiene `PROVIDER_TIMEOUT_MS` (20 s).
- `sync-mail` no evalúa presupuestos ni envía avisos: los avisos son locales y los reclama la app (ver "Avisos de
  presupuesto (Plan 4c)").

## Tasa del dólar (`fetch-usd-rates`)
- Fuente (spike del Plan 3c): el archivo histórico público del BCRD "Tasas de cambio del dólar de referencia del mercado
  spot" (`.../mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx`, hoja `Diaria`, columna **Venta**). GET anónimo,
  sin token. El lector (`_shared/rates/bcrd.ts`) abre el xlsx sin dependencias (`xlsx.ts`: zip + XML) y **lanza** en
  vez de adivinar: formato desconocido, fecha imposible, tasa ilegible o dos tasas distintas para un día. Si cambió el
  formato: 502 y no se escribe nada; las tasas guardadas siguen.
- Cron `fetch-usd-rates` `'0 13,23 * * *'` (09:00 y 19:00 hora dominicana: el archivo se actualiza hacia las 17:50) con
  `invoke_fetch_usd_rates()`; URL y secreto en Vault (`fetch_usd_rates_url`, `fetch_usd_rates_secret`),
  `Authorization: Bearer <FETCH_USD_RATES_SECRET>`. En local no hay cron (se invoca la función a mano).
- Ventana: `usd_rates_fetch_window()` la decide en SQL. Si el historial guardado no llega al día 1 del mes anterior al
  gasto en USD más viejo, se rellena desde ahí; si ya llega, se pide desde la última tasa guardada menos 7 días (una
  racha de corridas fallidas no deja huecos). El handler guarda con upsert por `rate_date` solo las fechas de la
  ventana, así que reintentar es idempotente. **Piso:** la ventana nunca empieza antes del día 1 del mes 13 meses antes
  del actual; si no, un gasto manual con fecha vieja de cualquier usuario la arrastraba a filas históricas ilegibles del
  BCRD y la descarga fallaba para todos.

## Avisos de presupuesto (Plan 4c)
- **Locales, sin Firebase ni Expo Push, sin montos.** El servidor decide y reclama; la app muestra lo reclamado.
  RPC `claim_budget_alerts()` y `silence_budget_alerts()`: `security definer`, solo actúan sobre `auth.uid()` (EXECUTE
  solo `authenticated`). La lógica vive en funciones internas con fecha fija (`budget_progress`,
  `crossed_budget_thresholds`, `claim_budget_alerts_at`, `silence_budget_alerts_at`: sin EXECUTE para la app; pgTAP las
  prueba con `p_today`). Gasto = `spending_transactions.amount_dop`; comparación en numeric
  `spent_dop * 100 >= limit_amount * threshold`.
- **Una vez por umbral y período** (`budget_alerts`). Un salto 70 → 105 % devuelve solo el 100 y deja el 80 reclamado.
  Reclamar 100 reclama también 80 aunque el 80 esté apagado en el perfil; solo se devuelve lo que la llamada insertó
  y está encendido en `alert_thresholds`.
- **Lo ya cruzado no avisa al activar**: encender "Avisos en este teléfono" o un umbral llama antes a
  `silence_budget_alerts()` (si falla, no se guarda nada). Trigger `budgets_reset_alerts`: al insertar un presupuesto
  activo, cambiar `limit_amount` o reactivarlo borra los reclamos del período y reclama en silencio lo ya cruzado;
  guardar el mismo monto (el upsert reescribe la fila) no reinicia nada.
- **Texto exacto**: `Llevas el 80 % de tu presupuesto semanal` / `Llegaste a tu presupuesto semanal` (`mensual` para el
  mes), cuerpo `Toca para ver tu gasto.`, `data: { kind: 'budget' }`; tocar abre Inicio. Canal Android `budget`
  ("Presupuesto"). Texto en `notifications/text.ts`; nunca montos.
- **Cableado**: tarea `recibo-budget-alerts` (`expo-background-task`, ≥ 15 min) definida en `background.ts`, importado desde
  `index.ts`; además se revisa al abrir o volver a la app (`BudgetAlertsBootstrap`). **Nunca reclamar sin sesión,
  preferencia y permiso** (`shouldCheck`): un teléfono apagado se "comería" el aviso del otro. La preferencia es por
  teléfono (AsyncStorage `recibo:device-alerts`, apagada al instalar) y se borra, con la tarea, al cerrar sesión o al
  arrancar sin sesión. Android 13+ informa `denied` antes de pedir: solo es "bloqueado" si la app ya pidió
  (`recibo:device-alerts-asked`, `resolvePermission`).
- **Limitación aceptada**: un cruce que se detecta cuando su período ya terminó (p. ej. domingo 23:50 sincronizado el
  lunes) no avisa.
- Los flujos (`flows.ts`) reciben un `AlertsPort`; `native-port.ts` es la única implementación nativa. Android puede
  espaciar la tarea o pausarla si se fuerza el cierre de la app (aceptado por el usuario).

## Supabase / Postgres — reglas
- **Dinero**: `numeric(14,2)`, nunca `float`. Las sumas se hacen en SQL, no en JS.
- **Fechas**: `timestamptz`. Los límites de semana/mes se calculan en la zona
  del usuario (`profiles.timezone`, default `America/Santo_Domingo`). Semana
  empieza **lunes**.
- **Agregados (home, historial, presupuesto) → RPC SQL**, no traer filas y sumar
  en el cliente. Ej.: `get_spending_summary(period, ref_date)`,
  `get_history(granularity, from, to)`. Toda RPC con rango lo acota en el servidor: `get_history` rechaza (22023)
  rangos nulos, invertidos o de más de 520 períodos. `get_category_spending(from, to)` (fechas locales, `to`
  exclusivo, null/null = todo; rango a medias, invertido o vacío → 22023) y `get_spending_overall()` (primera fecha,
  total y cantidad; sin gastos `(null, 0, 0)`).
- **PostgREST recorta a 1000 filas** silenciosamente. Listados de
  `transactions` siempre paginados (`.range()` + `count: 'exact'`; Movimientos usa keyset, ver Convenciones de la app).
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
- **Conversión USD→DOP (Plan 3c).** `public.usd_rate_on(user, at)` es la única regla de tasa: fecha local del gasto en
  la zona del perfil, última tasa del BCRD en o antes de esa fecha (fines de semana, feriados, hoy sin publicar) y, si
  no hay ninguna, el respaldo `profiles.usd_rate`. `public.transactions_with_rate` es la única fórmula
  `round(amount * rate, 2)`; `spending_transactions` y la lista de Movimientos/Inicio leen de ella. Las RPC suman
  `amount_dop`. `usd_rates` es una tabla de referencia **sin `user_id`** (excepción a la regla de RLS por `user_id`,
  como las categorías por defecto): `select` para `authenticated`, escribe solo `service_role`.
- `transactions`: las columnas de identidad (`user_id`, `source`, `message_id`,
  `linked_account_id`, `bank_code`, `template_id`) son inmutables; un trigger
  `before update` lanza 42501 (migración `transactions_immutable_columns`). Los
  correos importados nunca se borran (solo se borran las manuales).
- **Referencias entre filas, siempre del mismo dueño.** Una FK no basta: `reversed_by` solo apunta a un movimiento del
  mismo usuario (trigger `transactions_reversed_by_same_owner`, 42501) y `category_id` solo a una categoría por
  defecto o propia (policies de insert/update, igual que `merchant_rules`). Una columna nueva que referencie otra fila
  de usuario necesita la misma regla, y toda consulta `security definer`/`service_role` que lea filas por id filtra
  también por el dueño.
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
- **Reglas de categoría en SQL.** `public.match_category(user, merchant, counterparty_last4)` es la única definición
  de "qué regla aplica" (`strpos` literal sobre `lower()`, gana `priority` menor y luego el patrón más largo). El trigger
  `transactions_assign_category` la usa al insertar cualquier movimiento sin categoría (manual o del sync); la RPC
  `save_merchant_rule` crea/actualiza la regla y la aplica a los movimientos sin categoría. Ni la app ni `sync-mail`
  reimplementan la coincidencia.
- **Avisos de presupuesto.** `profiles.alert_thresholds` (`{80,100}` por defecto) es la única fuente de qué umbrales
  avisan; `claim_budget_alerts` solo reclama esos (no `sync-mail`). La app muestra el borde amarillo y la `CallingCard` siempre.
- `public.budget_period_bounds(period, ref)` es la única regla de límites de período (semana desde el lunes, mes
  calendario; fin exclusivo); `get_spending_summary` y los avisos la usan. Los períodos de presupuesto no se recalculan con `date_trunc` suelto (`get_history` sí agrupa con `date_trunc`, es historial, no presupuesto).
- `push_tokens` queda sin uso en la v1 (avisos solo locales); no se borra.
- `profiles.timezone` se valida contra `pg_timezone_names` (trigger; zona inválida → 22023).

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
  `MailProvider.fetchNew(accessToken, cursor): Page`) y el orquestador no sabe
  cuál tiene enfrente. Un test genérico recorre todos los parsers registrados
  y valida el contrato.
- **I — interfaces pequeñas.** `MailProvider` expone solo `fetchNew` y
  `refreshToken`; `SyncRepository` solo `readToken`, `saveToken`, `ingest`, `saveUnparsed`,
  `advanceCursor`, `markAccount`, `logSync`. Nada de pasar el cliente de Supabase entero a quien solo inserta.
- **D — depender de abstracciones.** `syncAccount` recibe `MailProvider` y
  `SyncRepository` por parámetro (inyección simple en el handler); los
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
  (`RD$ 1,234.56`, `US$ 12.00`). La transacción conserva su moneda. Movimientos e Inicio leen la vista
  `transactions_with_rate`: la app **nunca multiplica**; la fila en USD muestra `≈ RD$ …` (`formatApprox`) y el panel la
  tasa usada. `profiles.usd_rate` es solo la tasa de respaldo (rótulo "Tasa de respaldo" en Ajustes).
- Textos de UI en español, sin i18n. Sin `console.log` en código de producción.
- Componentes funcionales, hooks, sin clases. Un componente por archivo.
- Estilo visual: spec `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md`. Colores solo desde
  `src/theme` (ningún hex fuera de `colors.json`); los montos siempre con `Amount`/`formatMoney`,
  nunca inclinados; el rojo nunca en texto de menos de 18 px; toda animación pasa por
  `src/theme/motion.ts` y respeta "reducir animaciones".
- Entradas animadas: las formas de fondo entran con fundido (`fadeInFor`); títulos, paneles y
  tarjetas con `slam` (`enteringFor`). Si un elemento necesita animación de entrada **y** una
  rotación/transform estática, la rotación va en un `View` interior (el `entering` de Reanimated
  reemplaza el transform).
- Componentes nuevos se revisan primero en la galería (`/dev/gallery`).
- Sesión: `useSession()` / `useUserId()` de `src/features/auth/hooks.ts` (contexto de `SessionProvider`);
  nunca `supabase.auth.getSession()` dentro de pantallas. Al cerrar sesión se borra la caché de TanStack Query.
- Movimientos pagina por `(occurred_at, id)` con `keysetFilter` (`src/features/transactions/keyset.ts`); nunca offset:
  el sync inserta filas mientras el usuario baja.
- Listas largas en `ListScreen` (un `FlatList` real, título como cabecera); `Screen` solo para contenido corto.
  Nunca un `FlatList` dentro de un `ScrollView`.
- Montos que escribe el usuario: `src/features/transactions/amount-input.ts` en centavos enteros; se envían
  como `cents / 100`. Nunca `parseFloat` sobre lo escrito.
- Fechas y rangos en la zona del perfil (`useTimeZone()` + `src/lib/dates.ts`); los rangos de filtros salen de
  `periodRange`, con las mismas reglas que las RPC (semana desde el lunes).
- Gasto manual: `source = 'manual'`, `type = 'card_purchase'`. El efectivo no se registra aparte: el retiro de
  cajero es el gasto.
- Encabezados de grupo con `SectionHeader`; interruptores con `SkewToggle` (fila completa tocable); paneles que solo
  piden un monto con `AmountForm`; avisos posteriores a una acción con `NoticeBar`; subpantallas (`/categories`,
  `/rules`) con `BackButton` arriba.
- Toda mutación que cambie qué cuenta como gasto (movimientos, categorías, reglas) invalida con `invalidateSpending`
  de `src/features/transactions/invalidate.ts`. Cambiar la zona o la tasa en Ajustes invalida todas las consultas.
- Valores optimistas solo desde `mutation.variables` mientras `isPending`; nunca `setQueryData`.

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
- **Fuera de alcance v1** (no implementar aunque parezca fácil): iOS, registro
  público, dedup autorización/liquidación, tests de UI, IMAP, parseo con LLM,
  ingresos, versión web, multi-idioma. (La tasa automática del BCRD entró al
  alcance el 2026-10-09 como tarea del Plan 3 y quedó implementada en el Plan 3c; ver `docs/ALCANCE.md` §3.)
- **No bloquear v2**: presupuesto compartido en pareja. `budgets` y
  `transactions` se relacionan por `user_id`; una futura `budget_members` debe
  poder agregarse sin migrar datos. No diseñar nada que lo impida.
