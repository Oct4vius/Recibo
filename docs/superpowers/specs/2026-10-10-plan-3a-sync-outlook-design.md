# Plan 3a — Sincronización de correos con Outlook

**Fecha:** 2026-10-10 · **Estado:** aprobado en brainstorming (secciones 1–5), pendiente de revisión del spec
**Rama:** `dev` · **Depende de:** Plan 1 (`parseEmail`), Plan 2 (esquema, RLS, Vault), Plan 4b-2 (trigger de reglas
`transactions_assign_category`, `profiles.timezone`). **Retoma:** el brainstorming del Plan 3 del 2026-10-05.

## 1. Contexto y decisiones

El Plan 3 se partió en tres: **3a** (este spec: motor de sync + Outlook + vincular desde la app), **3b** (proveedor
Gmail) y **3c** (tasa diaria del BCRD). 3a termina con algo usable por los tres usuarios: vinculan su Outlook desde
la app y sus consumos de BHD aparecen solos, categorizados por sus reglas.

| Tema | Decisión |
|---|---|
| Proveedor | Outlook (Microsoft Graph). Gmail en 3b: solo agrega su `MailProvider` |
| Qué se descarga | Solo correos de remitentes bancarios (dominios del registro de parsers y de candidatos), desde un **cursor de fecha**. Nunca otros correos. Reemplaza el "delta link" de CLAUDE.md/ALCANCE |
| Id de correo | Inmutable (`Prefer: IdType="ImmutableId"`): no cambia al mover el correo de carpeta |
| Frecuencia | `pg_cron` cada 15 min. Sin botón "Sincronizar ahora" |
| Primera importación | Desde el día 1 del mes anterior (zona del perfil) |
| Ingesta y reversas | Una función SQL `ingest_transactions` (una transacción, candado por cuenta) |
| Vincular | Desde la app (Ajustes → Cuentas vinculadas) con `expo-auth-session` + PKCE, en una **build de desarrollo** (esquema fijo `recibo://`); script `dev:link-outlook` para probar sin teléfono |
| Avisos push | **Fuera** (4c: evaluar umbrales + registrar token + enviar, juntos). 3a no escribe `budget_alerts` |
| App | Cuentas vinculadas; Movimientos con paginación por `(occurred_at, id)`; reversas marcadas y "Marcar como revisado" |
| Reversa revisada | Nueva columna `transactions.reviewed_at`; sale de "Revisar" sin cambiar `is_ignored`/`ignored_reason` |
| Gastos manuales duplicados | Sin dedup manual↔importado (fuera de alcance); los manuales se pueden borrar |

Hechos verificados en la documentación de Microsoft (2026-10-09): el id de un mensaje cambia al moverlo salvo con el
header de id inmutable; `/me/messages` incluye Eliminados; `$filter` + `$orderby` exige las mismas propiedades en el
mismo orden (si no, `InefficientFilter`); páginas de 1 a 1000 con `@odata.nextLink`; las URI `http://localhost`
ignoran el puerto; las apps con cuentas personales no admiten parámetros en la URI de retorno; plataforma "Mobile and
desktop applications" para clientes nativos.

## 2. Componentes

### 2.1 Backend (`supabase/functions/`, Deno)

| Pieza | Responsabilidad |
|---|---|
| `_shared/mail/types.ts` | `MailProvider` con solo `fetchNew(cursor)` y `refreshToken()`; `Page<RawEmail>` con el cursor siguiente |
| `_shared/mail/graph.ts` | Proveedor Outlook: ids inmutables, cuerpo HTML → `RawEmail` (el texto lo normaliza `htmlToText`), refresh que devuelve el refresh token rotado |
| `_shared/mail/sender-query.ts` | Construye la consulta por remitente desde `senderDomains` del registro de parsers y de `candidates.ts` (una sola fuente). La forma (KQL `$search` o `$filter`) la fija el spike (§6, paso 1) |
| `_shared/mail/registry.ts` | `provider` de `linked_accounts` → `MailProvider`. Gmail (3b) se registra, no se ramifica |
| `_shared/sync/sync-account.ts` | Orquesta una cuenta (§3). Recibe `MailProvider` y `SyncRepository` por parámetro; sin SQL ni regex |
| `_shared/sync/repository.ts` | `SyncRepository`: `readToken`, `saveToken`, `ingest`, `saveUnparsed`, `advanceCursor`, `markAccount`, `logSync` |
| `_shared/sync/supabase-repository.ts` | Implementación con el service client y las RPC |
| `link-account/` | Sesión del usuario requerida. Canjea el código (§4), guarda el refresh token en Vault, crea o reactiva la cuenta |
| `unlink-account/` | Sesión del usuario requerida. Borra el secreto, `status = 'revoked'`, sin cursor |
| `sync-mail/` | Solo service role. Recorre cuentas `active`; un error por cuenta no aborta las demás |

`send-push` no se crea en 3a (llega en 4c dentro de la evaluación de presupuestos).

### 2.2 Base de datos (migraciones con pgTAP)

1. **Vault:** funciones `security definer` en un esquema privado para crear, rotar (update), leer y borrar el secreto
   de una cuenta. `EXECUTE` solo para `service_role`. `pg_net` se mueve de `public` a `extensions`.
2. **`transactions.reviewed_at timestamptz`** (null por defecto). El usuario la puede actualizar (política existente).
3. **`ingest_transactions(p_account_id uuid, p_rows jsonb)`** — §3.2. Solo `service_role`.
4. **Cron:** `pg_cron` cada 15 min llama a `sync-mail` con `pg_net`. URL y clave se leen de Vault: ninguna migración
   contiene la clave (repo público). `seed.sql` pone los valores locales; los del remoto los pone el usuario a mano.

### 2.3 App

- `src/features/accounts/`: api, keys (`accountKeys`), hooks, pantalla `/accounts` (§5).
- Movimientos: paginación por `(occurred_at, id)`, filas de reversa, "Marcar como revisado" (§5).
- Build de desarrollo: `expo-dev-client` + `eas.json` (perfil `development`, APK interno).

### 2.4 Herramientas

`bun run dev:link-outlook`: login de Microsoft en el navegador, código recibido en `http://localhost`, llamada a
`link-account` real (local o remoto). No guarda tokens.

## 3. Flujo de sincronización

### 3.1 Por cuenta (`sync-account.ts`)
1. Lee el refresh token de Vault y lo renueva; **guarda el nuevo en Vault antes de seguir** (Microsoft lo rota).
   `invalid_grant` → `status = 'error'`, `last_error = 'La sesión de Outlook expiró. Vuelve a vincular.'`, se salta.
2. Pide correos de remitentes bancarios recibidos desde `cursor − margen` (unos minutos), en orden ascendente, páginas
   de 50, **máximo 10 páginas por corrida**; si hay más, sigue la próxima corrida. El cursor es la fecha de recepción
   del último correo procesado (formato propio del proveedor, opaco para la app). Cursor inicial: día 1 del mes anterior
   en la zona del perfil.
3. `parseEmail()` por correo: `parsed` → filas con `message_id = <id inmutable>#<rowIndex>`; `unparsed` →
   `unparsed_emails` (asunto + primeros 500 caracteres, sin duplicar); `unknown_sender` → se descarta.
4. Una llamada a `ingest_transactions` por página; el cursor avanza después de cada página exitosa.
5. `sync_logs` (`fetched`, `parsed`, `unparsed`, `error`) y `linked_accounts` (`last_sync_at`, `status = 'active'`,
   `last_error = null`).
6. Error transitorio de Graph (429/5xx/red): se registra, el cursor no avanza, la cuenta sigue `active`.

### 3.2 `ingest_transactions` (una transacción)
1. `pg_try_advisory_xact_lock` por cuenta; si no se obtiene → devuelve `skipped` sin tocar nada.
2. Procesa las filas en orden de `occurred_at` (compra y reversa en la misma página se emparejan).
3. `insert … on conflict (linked_account_id, message_id) do nothing`: lo ya importado o editado nunca se pisa. El
   trigger `transactions_assign_category` categoriza lo nuevo.
4. Por cada reversa insertada: busca y bloquea (`for update`) la `card_purchase` con `is_ignored = false`, mismo
   usuario, `bank_code`, `card_last4`, `currency` y **monto exacto**, en las 72 h previas; la más cercana.
   - Encontrada: reversa `is_ignored = true`, `ignored_reason = 'reversed'`; compra `is_ignored = true`,
     `ignored_reason = 'reversed'`, `reversed_by = <reversa>`.
   - No encontrada: reversa `is_ignored = true`, `ignored_reason = 'unmatched_reversal'`.
   - Nunca por monto aproximado.
5. Devuelve `{ inserted, duplicates, paired, unmatched }` (o `skipped`).

## 4. Vincular, desvincular y seguridad

**Vincular:** `expo-auth-session` con autoridad `common`, PKCE S256, `redirect_uri = recibo://auth/microsoft`,
`prompt=select_account`, scopes `openid email offline_access Mail.Read` (el correo de la cuenta sale del `id_token`).
La app envía `{ provider: 'outlook', code, codeVerifier, redirectUri }` a `link-account` con su sesión.
**Regla dura: la app nunca canjea el código ni recibe tokens.** `link-account` canjea como cliente público (sin
secreto, misma `redirect_uri`), guarda el refresh token en Vault y crea la cuenta (o reactiva una `revoked`,
reemplazando su secreto) con el cursor inicial. Errores de Microsoft (cancelado, consentimiento denegado, código
vencido) → mensajes en español. Nada de códigos ni tokens en errores ni logs.

**Desvincular:** confirmación "¿Desvincular <correo>? Los movimientos ya importados se quedan."; verifica que la
cuenta sea del usuario, borra el secreto, `status = 'revoked'`, `vault_secret_id` y `sync_cursor` en null. Microsoft
no permite revocar un token de una app en cuentas personales: la pantalla indica "Para quitar también el permiso en
Microsoft: account.live.com/consent". CLAUDE.md se corrige ("revocar token en el proveedor" no aplica a Outlook).

**Seguridad:** `link-account`/`unlink-account` exigen sesión; `sync-mail` solo service role (el plan verifica si el
proyecto usa la `service_role` JWT antigua o las claves nuevas). `client_id` de Microsoft es público:
`EXPO_PUBLIC_MS_CLIENT_ID` vía `env.ts` en la app y secreto de entorno en las funciones. Sin client secret. Funciones de
Vault solo para service role. El `state` de `expo-auth-session` protege contra CSRF.

## 5. App

**Cuentas vinculadas (`/accounts`, con `BackButton`):** en Ajustes, la fila "Gmail y Outlook · Próximamente" pasa a
"Cuentas vinculadas". Cada cuenta es un `SkewRow`: correo y estado ("Activa · sincronizada hace 6 min",
"Esperando la primera sincronización", "Error · <last_error>", "Desvinculada"). Tocar una activa abre un panel con
"Desvincular" y la nota de account.live.com. Botón "Vincular Outlook" y fila atenuada "Gmail · próximamente". Texto
relativo ("hace 6 min", "hace 2 h", "ayer") en una función pura con tests. TanStack Query con `accountKeys`;
vincular/desvincular invalidan; tirar para recargar.

**Movimientos:**
- Paginación por `(occurred_at, id)`: cada página pide lo anterior al último visto (helper puro que arma el filtro
  `.or(...)`, con tests). El conteo sale de la primera página.
- `card_reversal`: marca "Reversa" y monto con signo menos (recto); sin "Ignorar/Contar este gasto". Si
  `ignored_reason = 'unmatched_reversal'` y `reviewed_at` es null: acción "Marcar como revisado" (`reviewed_at = now()`).
- "Revisar" = `ignored_reason = 'unmatched_reversal'` y `reviewed_at is null`.
- `TransactionListItem` agrega `ignoredReason` y `reviewedAt`; mutaciones con `invalidateSpending`.

**Build de desarrollo:** `expo-dev-client` + `eas.json`. El usuario corre `eas login` y
`eas build --profile development --platform android` (con `!`) e instala el APK; desde entonces `bun run start` abre en
esa build y las checklists de 3a se corren ahí, no en Expo Go.

Movimiento: sin animaciones nuevas; se reutilizan `SkewRow`, `SlamSheet`, `SkewButton`, `BackButton`.

## 6. Pruebas, orden y pasos del usuario

**Pruebas:**
- Deno (sin red): `graph.ts` con JSON de Graph anonimizados (consulta, páginas, ids, `RawEmail`); `sync-account.ts` con
  proveedor y repositorio en memoria (token rotado guardado, cursor, límite de páginas, aislamiento de errores);
  handlers de las tres funciones con dependencias inyectadas.
- pgTAP: `ingest_transactions` (idempotente; monto exacto; **el par real 438.42/434.22 no se empareja**; ventana de
  72 h; compras ignoradas no son candidatas; `skipped` con candado tomado; el trigger categoriza); Vault solo
  service role; `reviewed_at` editable por el dueño y no por otro usuario.
- Vitest (puro): texto relativo de sincronización, filtro de keyset, presentación de filas de reversa.

**Orden:**
1. Spike de Graph (desechable): script local con login que prueba KQL `from:<dominio>` frente a `$filter` por
   dirección, y si cubre Correo no deseado; imprime solo conteos. El resultado se anota en este spec.
2. Migraciones (Vault + `pg_net`, `reviewed_at`, `ingest_transactions`, cron).
3. `_shared/mail` y `_shared/sync`.
4. `link-account`, `unlink-account`, `sync-mail`.
5. E2E local: `supabase functions serve` + `bun run dev:link-outlook` + una corrida de `sync-mail`: los movimientos
   reales de BHD aparecen en la base local antes de tocar la app.
6. App: Cuentas vinculadas + build de desarrollo.
7. App: keyset + reversas.
8. Documentación: CLAUDE.md y ALCANCE (cursor de fecha + filtro por remitente, ids inmutables, desvincular), roadmap,
   checklist del dispositivo.
9. Remoto con aprobación del usuario: migraciones, `supabase functions deploy`, secretos, valores del cron en Vault.

**Pasos del usuario:** registro en Microsoft Entra (plataforma "Mobile and desktop applications", cuentas personales y
de trabajo, URIs `recibo://auth/microsoft` y `http://localhost`); `eas login` y la build; aprobar el paso al remoto.

**Riesgos:** límites de la búsqueda de Graph (los resuelve el spike); tiempo de las Edge Functions en el plan
gratuito (acotado a 10 páginas por corrida); refresh tokens de Microsoft caducan tras ~90 días sin uso (el cron los
mantiene); Supabase pausa tras 7 días sin actividad (el cron cuenta como actividad).

**Fuera de 3a:** avisos push y registro de token (4c), Gmail (3b), tasa del BCRD (3c), "Sincronizar ahora".
