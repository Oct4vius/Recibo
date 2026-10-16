# Plan 3b — Sincronización con Gmail (y receta para agregar bancos)

Fecha: 2026-10-15. Base: 3a terminado y en producción (`docs/superpowers/specs/2026-10-10-plan-3a-sync-outlook-design.md`).

## 1. Intención

Dos de los tres usuarios (la pareja y la madre del usuario) reciben en **Gmail** las alertas de sus tarjetas **BHD**
(y Banreservas, que queda para después). El 3b les permite vincular su Gmail desde la app, en Ajustes → Cuentas
vinculadas, igual que Outlook, para que sus consumos del BHD aparezcan solos cada 15 minutos con las mismas reglas,
reversas, categorías y presupuestos.

Además, el 3b deja una **receta reutilizable** (§7) para agregar un banco o una plantilla nueva en cuanto el usuario
entregue `.eml` reales (Banreservas primero), con las herramientas versionadas que hoy son scripts sueltos.

### Metas
- "Vincular Gmail" en la app; el usuario acompaña a cada persona la primera vez.
- `sync-mail` sincroniza cuentas Gmail con el mismo contrato `MailProvider`, el mismo `SyncCursor`, la misma ingesta
  idempotente y los mismos parsers. El orquestador no cambia (OCP: el proveedor se registra).
- Desvincular Gmail revoca el token en Google (a diferencia de Microsoft, Google lo permite).
- Receta + herramientas para agregar bancos desde `.eml`.

### No metas
- Parsers de Banreservas, Popular o APAP (esperan `.eml` reales; se hacen con la receta).
- Verificación de la app OAuth por Google (CLAUDE.md: app publicada "En producción" sin verificar, máx. 100 usuarios).
- Push y presupuestos (4c), tasa del BCRD (3c), notificaciones push de Gmail (`users.watch`/Pub/Sub).

### Anti-metas
- Que un token de Gmail toque el dispositivo o un log (regla dura de CLAUDE.md).
- Que una alerta movida de etiqueta, archivada o borrada se importe dos veces.
- Pedir más permisos que `gmail.readonly`.

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Login en Android | **Google Sign-In nativo** (`@react-native-google-signin/google-signin`, config plugin de Expo) con `offlineAccess: true` y el scope `https://www.googleapis.com/auth/gmail.readonly`. Devuelve un `serverAuthCode` que la app manda a `link-account`. Google ya no permite por defecto esquemas propios (`recibo://`) en clientes Android nuevos y recomienda su SDK nativo; por eso **no** se usa `expo-auth-session` para Google. |
| Clientes OAuth en Google Cloud | Uno **Web** (id + secreto; el `webClientId` del SDK y el que canjea en el servidor) y uno **Android** (paquete `com.oct4vius.recibo` + SHA-1 del keystore de EAS; sin él el SDK falla con `DEVELOPER_ERROR`). Pantalla de consentimiento "Externa", publicada en producción sin verificar. |
| Canje | `link-account` canjea el `serverAuthCode` con el **client secret Web** (secreto de Edge Function `GOOGLE_CLIENT_SECRET`, más `GOOGLE_CLIENT_ID`); `redirect_uri` vacío para el código del SDK. El refresh token va a Vault con `link_mail_account(p_provider = 'gmail')`. El correo de la cuenta sale del `id_token`/userinfo (scope `email`). |
| Contrato de `link-account` | Se amplía: `{ provider: 'outlook', code, codeVerifier, redirectUri }` (sin cambios) o `{ provider: 'gmail', code, redirectUri? }`. Un canjeador por proveedor, registrado (OCP), no un `if` creciente en el handler. |
| Script de terminal | `bun run dev:link-gmail [--target local|remote]`: login en el navegador con el **mismo cliente Web** y redirect loopback `http://localhost:53682/callback` registrado en ese cliente; manda `{ provider: 'gmail', code, redirectUri }` a `link-account`. |
| Consulta | Gmail API `users.messages.list` con `q = "from:(a OR b) after:<epoch>"` (las mismas `senderAddresses` del registro, una sola fuente; `after:` con segundos epoch es exacto), `includeSpamTrash=true` (una alerta en Spam también cuenta; los ids no cambian), `maxResults` 50, `pageToken`. Luego `users.messages.get` por id con `format=full`: se toma la parte `text/html` (base64url) → `htmlToText`. |
| Ids | El id de mensaje de Gmail **no cambia** al cambiar etiquetas, archivar o mover a Spam/Papelera: sirve directo como `messageId` (sin el problema de Graph). |
| Orden | Gmail devuelve lo más nuevo primero. El `SyncCursor` ya lo tolera: `since` queda fijo mientras hay `next`, `maxSeen` acumula y pasa a `since` al terminar. Máx. 10 páginas por corrida, igual que Outlook. |
| Refresh | Google normalmente **no** rota el refresh token: si la respuesta no trae uno nuevo, `TokenSet.refreshToken` devuelve el mismo. `invalid_grant` → `MailAuthError` (cuenta en `error`, "La sesión de Gmail expiró. Vuelve a vincular."). |
| Desvincular | `unlink-account` revoca en `https://oauth2.googleapis.com/revoke` (best effort: si falla, igual borra el secreto y marca `revoked`) y luego `unlink_mail_account`. Para Outlook se mantiene la indicación de account.live.com/consent. |
| App | Botón "Vincular Gmail" junto a "Vincular Outlook" en Cuentas vinculadas; mismos estados y errores. Cancelar el login de Google muestra un aviso, como en Outlook. |

## 3. Componentes

- `supabase/functions/_shared/mail/gmail.ts` — `createGmailProvider({ clientId, clientSecret, fetchImpl })`:
  `refreshToken` y `fetchNew` (list + get, `RawEmail` desde el MIME de Gmail). Errores: 401 → `MailAuthError`,
  429/5xx/red/JSON inválido → `MailTransientError`, `pageToken` inválido → reiniciar desde `since` (como Graph).
- `_shared/mail/google-auth.ts` — canje del código y refresh contra `https://oauth2.googleapis.com/token`; revocación.
- `_shared/mail/sender-query.ts` — agrega el armado de la `q` de Gmail desde `bankSenderAddresses()` (una sola fuente
  de remitentes para ambos proveedores).
- `_shared/mail/registry.ts` — registra `gmail`.
- `link-account` / `unlink-account` — canjeadores y revocadores por proveedor, inyectados (handlers testeables).
- App: `src/features/accounts/google.ts` (configuración del SDK, sin secretos), `LinkGmailButton.tsx`,
  `app.json` (plugin del SDK), `env.ts` (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, validado en el schema).
- `scripts/dev-link-gmail.ts` + `scripts/lib/google-login.ts` (loopback; reutiliza `waitForCode`/`openBrowser`).
- Secretos: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` en `supabase/functions/.env(.example)` y `supabase secrets set`.
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en `.env.local` y en el entorno `preview` de EAS.

Sin migraciones: `mail_provider` ya incluye `gmail` y `link_mail_account` recibe el proveedor.

## 4. Pruebas

- Deno: `gmail.ts` con `fetch` falso (query exacta con `after:` y `includeSpamTrash`, paginación, HTML base64url →
  texto, sin parte HTML → correo vacío que cae en `unparsed`, 401/429/5xx, refresh sin refresh token nuevo,
  `invalid_grant`); `google-auth.ts`; handlers de `link-account`/`unlink-account` con el proveedor `gmail`
  (revocación que falla no impide desvincular).
- Vitest: nada nuevo salvo lógica pura que aparezca en `features/accounts`.
- E2E local con un Gmail real (el del usuario o el de su pareja, con su permiso): `dev:link-gmail` + `dev:sync`;
  idempotente al repetir.

## 5. Pasos del usuario

1. Google Cloud Console: proyecto, habilitar Gmail API, pantalla de consentimiento externa con el scope
   `gmail.readonly`, publicar en producción; cliente Web (redirect `http://localhost:53682/callback`) y cliente
   Android (paquete + SHA-1 de EAS, que Claude obtiene con `eas credentials`). Claude da la guía paso a paso.
2. Poner los ids en `.env.local`; aprobar cada paso remoto (secretos, deploy, build).
3. Acompañar a su pareja y a su madre en la pantalla "Google no verificó esta app" (Configuración avanzada → Ir a Recibo).

## 6. Riesgos

- Límite de 100 usuarios y pantalla de advertencia (aceptado).
- Google puede exigir revisión de seguridad para scopes restringidos si la app crece; no aplica a 3 usuarios.
- El SHA-1 debe coincidir con el keystore que firma el APK (EAS); un APK firmado con otro keystore no podrá vincular.
- Que el BHD mande a Gmail desde otra dirección o con otro formato: el E2E lo detecta y la receta (§7) lo resuelve.

## 7. Receta: agregar un banco o una plantilla desde `.eml` reales

Para cuando el usuario entregue `.eml` (Banreservas primero) o haya correos en "sin procesar". Se versiona como
`docs/agregar-banco.md` y se apoya en dos herramientas nuevas del 3b:

- `scripts/dev-download-eml.ts` — descarga el MIME original de los correos sin procesar de una cuenta (Outlook vía
  Graph `/$value`, Gmail vía `format=raw`) a `fixtures-raw/<bank>/_downloaded/` (gitignored). Login en el navegador;
  nunca usa los tokens de Vault.
- `scripts/anonymize-eml.ts` — decodifica el HTML, aplica reemplazos de un archivo local gitignored
  (`fixtures-raw/anonymize.local.json`: nombres, últimos 4, cuentas, confirmaciones, teléfonos) más reglas genéricas
  (números de 10–15 dígitos), escribe un `.eml` mínimo (From, Subject, Date, Message-ID, HTML) y **falla** si queda
  algún término prohibido de ese archivo en el `.eml` o en el texto normalizado.

Pasos de la receta:
1. Conseguir los `.eml` (los entrega el usuario, o `dev-download-eml`).
2. Anonimizar con `anonymize-eml` y revisar a ojo el texto normalizado; `bun run fixtures:build`.
3. Si el banco es nuevo: confirmar remitente exacto y dominio; moverlo de `candidates.ts` a un `BankParser` con
   `senderDomains`, `senderAddresses`, `templates` e `ignored`.
4. Por cada formato: test primero con la lista exacta de `ParsedTransaction`, luego la plantilla. Correos conocidos que
   no son gasto (ingresos, códigos, publicidad del banco) → `IgnoredEmail`.
5. `bun run check`; revisión; documentar el formato en CLAUDE.md (sección del banco).
6. Con aprobación: `functions deploy sync-mail`; reiniciar el cursor de las cuentas afectadas a `initial_sync_cursor`
   y disparar el sync (idempotente); marcar como resueltos los `unparsed_emails` que ahora se leen o se ignoran.
7. Revisar el diff antes de push (repo público: ningún dato personal en fixtures).

## 8. Decisiones de Claude tras la revisión del diseño

- **Revincular:** Google solo entrega `refresh_token` en el primer consentimiento. El SDK se configura con
  `forceCodeForRefreshToken: true` y `link-account` responde un error claro si el canje no trae refresh token.
- **Desvincular Gmail:** `unlink-account` lee primero el proveedor y el token de la cuenta (`mail_account_token`), revoca
  en Google (best effort) y después llama a `unlink_mail_account`, que borra el secreto. Es una dependencia nueva del
  handler, inyectada.
- **Fechas de Gmail:** `messages.list` solo trae ids; `receivedAt` sale de `internalDate` de `messages.get`, y la parte
  `text/html` se busca recorriendo las partes MIME de forma recursiva.

## 9. Lo que queda al implementador

Nombres internos, forma exacta de los canjeadores registrados, textos de error en español en línea con los de
Outlook, y el orden de las tareas, siempre con tests primero y sin romper el contrato de `MailProvider`.
