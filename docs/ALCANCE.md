# Alcance — Tracker de gastos por correos bancarios

**Fecha:** 2026-09-17
**Estado:** aprobado para v1
**Nombre de trabajo:** `gastos-app` (pendiente nombre definitivo)

## 1. Problema y objetivo

Los bancos dominicanos notifican cada consumo por correo electrónico, pero nadie
suma esos correos. El objetivo es una app móvil Android (iOS más adelante) que vincule
una o varias cuentas de correo, detecte automáticamente las notificaciones de
consumo bancario y mantenga un tracker de cuánto se gasta por semana y por mes,
con presupuesto, categorías e historial.

**Usuarios:** el autor, su pareja y un amigo. Todos con Android. Es una app
privada: no se publica en tiendas ni se abre al público. El diseño soporta
multiusuario vía RLS, pero no se optimiza para escala.

**Restricción principal:** costo cero de infraestructura. Todo el backend vive en
el plan gratuito de Supabase.

## 2. Decisiones tomadas

| Tema | Decisión | Alternativas descartadas |
|------|----------|--------------------------|
| Plataforma móvil | Expo (managed) + Expo Router, TypeScript. **Android primero**; iOS diferido | React Native bare CLI |
| Distribución | APK/AAB por EAS Build, instalado a mano. Sin tiendas | Play Store, TestFlight |
| Proveedores de correo | Gmail y Outlook/Hotmail vía OAuth 2.0 (solo lectura). Outlook es el correo del autor | IMAP genérico |
| Registro | Abierto desde la app, con confirmación por código de 6 dígitos enviado por correo (SMTP propio gratuito). Decidido 2026-10-05 | Registro cerrado por invitación (descartado: el autor no quiere mantener una lista de usuarios); registro sin confirmación |
| Dónde se leen los correos | Backend en Supabase: pg_cron → Edge Function cada 15 min | Lectura en el celular al abrir; webhooks en tiempo real |
| Parseo de correos | Solo reglas (regex por banco y plantilla) | LLM total o de respaldo |
| Bancos v1 | **BHD** con parser (único correo verificado). Banreservas, Popular y APAP quedan como *candidatos*: sus correos se capturan crudos hasta tener una muestra real | Escribir parsers a ciegas |
| Login | Email + contraseña con Supabase Auth | Social login Google/Apple |
| Gestor de paquetes | Bun | npm, yarn |
| Estilos | NativeWind (Tailwind para RN) | StyleSheet nativo |
| Datos remotos en la app | TanStack Query + cliente Supabase | Redux, MobX |
| Acceso a la base de datos | Sin ORM: migraciones SQL con la CLI de Supabase, `supabase-js` en app y Edge Functions, tipos con `supabase gen types` | Prisma (no corre bien en Deno, ignora RLS, no expresa políticas ni pg_cron), Drizzle |
| Push | Expo Push Service (gratis) | FCM/APNs directo |

## 3. Funcionalidades v1

### 3.1 Autenticación
- Login y recuperación de contraseña con Supabase Auth.
- **Registro abierto con confirmación.** Pantalla de registro (email +
  contraseña); Supabase envía un código de 6 dígitos que el usuario escribe en
  la app para confirmar. La recuperación de contraseña usa también un código.
  Sin deep links ni página web. Requiere SMTP propio (el integrado de Supabase
  solo entrega a miembros del equipo del proyecto).
- Riesgos aceptados: cuentas creadas por bots (mitigable con CAPTCHA si aparece)
  y el tope de 100 usuarios de la app de Google sin verificar.
- Sesión persistida en `expo-secure-store`.

### 3.2 Vinculación de cuentas de correo
- Vincular una o varias cuentas Gmail y/o Outlook.
- Flujo OAuth con PKCE desde la app (`expo-auth-session`). La app recibe solo el
  código de autorización y lo envía a la Edge Function `link-account`, que lo
  intercambia por tokens usando el client secret y guarda el refresh token en
  **Supabase Vault**. El celular nunca almacena tokens de correo.
- Scopes mínimos: `gmail.readonly` (Google) y `Mail.Read` + `offline_access`
  (Microsoft).
- Pantalla de cuentas vinculadas: estado del último sync, último error,
  desvincular (revoca token y borra el secreto).

### 3.3 Sync de correos (backend)
- `pg_cron` cada 15 minutos invoca vía `pg_net` la Edge Function `sync-mail`.
- Por cada cuenta vinculada activa:
  1. Refrescar access token desde Vault.
  2. Pedir solo correos nuevos de remitentes bancarios conocidos, usando el
     cursor guardado (Gmail: `historyId`; Outlook: delta link).
  3. Pasar cada correo por el parser del banco correspondiente.
  4. `upsert` de la transacción con `(linked_account_id, message_id)` como clave única
     (`UNIQUE` plano). Idempotente:
     reintentar nunca duplica.
  5. Correos de banco conocido sin plantilla que matchee → tabla
     `unparsed_emails` (asunto + fragmento) para escribir la plantilla después.
     **Nunca se adivina un monto.**
  6. Registrar resultado en `sync_logs`.
- Al terminar, evaluar presupuestos y enviar push si se cruzó un umbral aún no
  notificado.
- La única deduplicación en v1 es por `message_id`. La dedup de autorización +
  liquidación queda **diferida** hasta que los correos reales muestren que
  algún banco envía dos correos por la misma compra.

### 3.4 Parsers por banco
- Registro `senderDomain → bankCode` y, por banco, lista ordenada de plantillas.
- Cada plantilla extrae: `type`, `amount`, `currency`, `merchant`, `occurredAt`,
  `cardLast4` (opcional).
- Tipos de movimiento v1: consumo con tarjeta (débito/crédito), **reversa de
  consumo**, retiro en cajero, transferencia enviada. Los ingresos se ignoran.
- **Reversas:** BHD envía un correo `Estado = Reversada` cuando una compra se
  anula, con el comercio vacío y solo monto, moneda y fecha. El sync busca la
  compra aprobada con la misma tarjeta, moneda y monto exacto en las 72 h
  previas y marca ambas como ignoradas, dejando el gasto neto en cero. Si no
  encuentra pareja, la reversa se guarda ignorada y **no se resta** del total:
  en el caso real observado (aprobada $438.42 y reversada $434.22 en el mismo
  minuto) la compra original nunca llegó por correo, y restarla subestimaría el
  gasto. Queda en un filtro "Revisar" para que el usuario decida.
- **Transferencias BHD:** plantilla distinta (asunto `Transacciones entre
  productos BHD y a otros Bancos`), tabla clave-valor con cuentas origen y
  destino enmascaradas, monto `RD$ 3,500.00`, beneficiario, número de
  confirmación y fecha `16/09/2026 - 9:53 AM`. Se registra como transferencia
  enviada con el beneficiario como "comercio". Una transferencia a una cuenta
  propia genera el mismo correo; se excluye del gasto con la categoría
  "Transferencias propias" (ver 3.5), no en el parser.
- **Retiros BHD:** según el usuario llegan en la misma tabla de transacciones
  con `Tipo = Retiro`. Sin muestra real todavía; el parser lo cubre cuando
  exista el `.eml`.
- Monedas: DOP y USD. Se guarda la moneda original.
- Funciones puras en TypeScript, sin APIs de Deno ni de React Native, en
  `supabase/functions/_shared/parsers/`.
- **Toda plantilla nace de un correo real anonimizado** guardado como fixture y
  cubierto por un test que compara la salida exacta.
- **Verificado con correo real (BHD, 2026-09):** remitente `Alertas@bhd.com.do`,
  asunto fijo `BHD Notificación de Transacciones`, cuerpo HTML con texto
  seleccionable. Encabezado `Visa Débito Intl # 1234` (producto + últimos 4) y
  tabla `Fecha | Moneda | Monto | Comercio | Estado | Tipo` con valores tipo
  `16/09/2026 10:42 pm | RD | $275.72 | UBER*RIDES | Aprobada | Compra`. El
  logo va como adjunto; se ignora.
- **Bancos candidatos (sin muestra real):** Banreservas, Popular y APAP no
  tienen parser en v1. Se registran solo sus dominios probables de remitente
  como *candidatos*; cualquier correo de esos dominios cae en `unparsed_emails`
  con asunto y fragmento. Cuando la pareja o el amigo vinculen su correo, esas
  filas son la muestra para escribir el parser. Nunca se escribe un parser sin
  correo real.
- **Fixture real de BHD disponible:** `fixtures-raw/bhd/card-purchase-approved.eml`
  (anonimizada: destinatario y últimos 4 de tarjeta). Es un `multipart/related`
  con el HTML en `quoted-printable` UTF-8 y el logo como adjunto `cid:img1`.
  Fecha en formato `dd/mm/yyyy hh:mm am|pm` hora local (sin zona horaria en el
  cuerpo; el header `Date` sí trae UTC). Monto `$275.72` con la moneda en
  columna aparte (`RD`). Cubre el caso `Aprobada + Compra`.
- **Fixtures reales de BHD en `fixtures-raw/bhd/`** (solo locales, fuera de git;
  en el repo viven sus derivadas JSON en `parsers/bhd/fixtures/`):
  `card-purchase-approved.eml` (Aprobada + Compra),
  `card-purchase-reversed.eml` (Reversada + Compra, comercio vacío),
  `card-purchase-approved-near-reversal.eml` (Aprobada $438.42 en el mismo
  minuto que la reversa de $434.22: regresión de "no emparejar por monto
  distinto") y `transfer-out.eml` (plantilla de transferencia). Faltan muestras
  reales de retiro en cajero y de estado `Declinada`.
- **Fixtures de captura de pantalla:** si algún caso solo existe en imagen, se
  transcribe y se marca `provisional` en el nombre. Se reemplaza por el `.eml`
  real cuando aparezca; el test debe pasar con ambos.

### 3.5 Tracker
- **Inicio:** gasto de la semana actual y del mes actual, comparado con el
  período anterior; barra de progreso del presupuesto.
- **Transacciones:** lista con filtros (período, banco, categoría, moneda),
  editar monto/comercio/categoría, marcar como ignorada, alta manual (efectivo).
- **Historial:** navegación por semanas, meses y años con totales y gráfica.
- **Categorías:** set por defecto + categorías propias. `merchant_rules` asigna
  categoría por patrón sobre el nombre del comercio o beneficiario, con
  prioridad; editable. Cada categoría tiene `counts_as_spending`; la categoría
  por defecto **"Transferencias propias"** lo tiene en falso y sus movimientos
  no suman a totales ni presupuesto, aunque siguen visibles.
- **Presupuesto:** límite semanal y/o mensual en DOP; alertas push al 80 % y
  100 %, una sola vez por período y umbral.
- **Moneda consolidada:** DOP es la principal; USD se convierte con una tasa
  fija configurable en ajustes para los totales.

## 4. Modelo de datos (Supabase, schema `public`, RLS por `user_id`)

| Tabla | Propósito |
|-------|-----------|
| `profiles` | timezone, moneda principal, tasa DOP/USD |
| `linked_accounts` | provider (`gmail`/`outlook`), email, `vault_secret_id`, `sync_cursor`, `status`, `last_sync_at`, `last_error` |
| `transactions` | `bank_code`, `type` (`card_purchase`/`card_reversal`/`atm_withdrawal`/`transfer_out`), `amount`, `currency`, `merchant` (nullable), `occurred_at`, `category_id`, `source` (`email`/`manual`), `is_ignored`, `ignored_reason` (`user`/`reversed`/`unmatched_reversal`), `reversed_by`, `reference`, `counterparty_last4`, `message_id` (unique por cuenta, `<id>#<fila>`), `card_last4`, `raw_snippet` |
| `categories` | nombre, icono, color, `counts_as_spending`; `user_id` null = por defecto |
| `merchant_rules` | `pattern`, `category_id`, `priority` |
| `budgets` | `period` (`week`/`month`), `limit_amount`, `currency`, umbrales |
| `budget_alerts` | período + umbral ya notificado |
| `push_tokens` | Expo push token por dispositivo |
| `sync_logs` | por corrida: fetched, parsed, unparsed, error |
| `unparsed_emails` | correos bancarios sin plantilla, para depurar |

Los agregados del historial (totales por semana/mes/año) se calculan con
funciones SQL (RPC), no en el cliente.

## 5. Estructura del repositorio

```
app/                    # Expo Router (pantallas)
src/
  components/           # UI reutilizable
  features/             # por dominio: auth, accounts, transactions, budgets, history
  lib/                  # supabase client, query client, formatters
  hooks/
  types/
supabase/
  migrations/           # SQL versionado
  functions/
    _shared/
      parsers/          # parsers por banco + fixtures + tests
      mail/             # clientes Gmail / Graph
    link-account/
    sync-mail/
    send-push/
  seed.sql              # solo datos de desarrollo local; las categorías por defecto salen de una migración
tests/
  unit/                 # Vitest (app)
docs/
  ALCANCE.md
```

## 6. Calidad y testing

**Principios:** SOLID y DRY en toda la base de código. En concreto: un parser
por plantilla registrado en un índice (agregar banco = agregar archivo, sin
ramas por banco en el orquestador), proveedores de correo y repositorio de
datos detrás de interfaces pequeñas e inyectadas en `sync-mail`, y una sola
fuente para montos, fechas, tipos de DB y agregados. Las reglas exactas viven
en `CLAUDE.md`.

- **App:** Vitest solo para lógica pura (`src/lib/money.ts`, `src/lib/dates.ts`,
  transformaciones en `features/*/api.ts`). **No se testean pantallas ni
  componentes** en v1: para tres usuarios el costo no se justifica.
- **Edge Functions y parsers:** `deno test`. Aquí sí es estricto: es donde
  viven los bugs caros.
- **Parsers:** ningún parser se mergea sin fixture real anonimizada. Un cambio
  de plantilla de un banco se atiende agregando fixture nueva, no editando la
  vieja.
- **Regresión:** cada bug fix trae un test que falla sin el fix, nombrado
  `describe("regression #<issue> — <qué>")`.
- **DB:** cambios en RLS, RPC o triggers traen test SQL (pgTAP) o de
  integración contra Supabase local.
- **Antes de done:** typecheck, lint y tests en verde.

## 7. Restricciones y riesgos conocidos

- **Google OAuth sin verificación:** la app se publica en estado "En producción"
  sin pasar verificación. Muestra pantalla de advertencia y limita a 100
  usuarios, pero los refresh tokens no caducan. En estado "Testing" caducan a
  los 7 días y obligarían a re-vincular cada semana.
- **Supabase free pausa proyectos inactivos** (7 días sin actividad). Se debe
  confirmar que las invocaciones del cron cuentan como actividad; si no, la
  app misma genera actividad al abrirse.
- **Distribución Android:** el APK se genera con EAS Build (plan gratuito, cola
  compartida) y se instala a mano. Cada nueva versión implica reenviar el APK a
  los tres usuarios; no hay actualización automática.
- **Plantillas de correo cambian:** los bancos rediseñan sus correos sin aviso.
  La tabla `unparsed_emails` y los `sync_logs` son la alarma temprana.
- **Correos en HTML:** los parsers trabajan sobre texto plano extraído del
  HTML; se normalizan espacios y entidades antes de aplicar regex.

## 8. Fuera de alcance (v1)

- **iOS.** Nadie del grupo tiene iPhone. Expo lo permite después sin cambios de
  código, pero exige Apple Developer (99 USD/año) y builds en la nube.
- Publicación en tiendas.
- Deduplicación autorización + liquidación (ver 3.3).
- Tests de pantallas y componentes.
- IMAP o cualquier proveedor distinto de Gmail/Outlook.
- Parseo con LLM.
- Ingresos, salarios, inversiones.
- Versión web.
- Integración directa con APIs bancarias.
- Multi-idioma (UI solo en español).
- Tasa de cambio automática.

## 8.1 Candidatos a v2 (no bloquear en el diseño)

- **Presupuesto compartido en pareja:** dos usuarios viendo un mismo presupuesto
  y la suma de sus gastos. El modelo v1 no debe impedirlo: `budgets` y
  `transactions` se relacionan por `user_id`, y una futura tabla
  `budget_members` puede agregarse sin migrar datos.
- Dedup autorización + liquidación, si los datos lo piden.
- Plan B para Gmail si el OAuth sin verificar se vuelve un problema: Google Apps
  Script en la cuenta del usuario que reenvía los correos bancarios a una Edge
  Function. No cambia parsers ni base de datos.

## 9. Criterio de éxito v1

Con Gmail y Outlook vinculados, una compra con tarjeta de cualquiera de los
cuatro bancos aparece en la app en menos de 20 minutos, categorizada, sumada al
gasto semanal y mensual, y dispara una notificación push si cruza el
presupuesto. Cero tokens de correo en el dispositivo.
