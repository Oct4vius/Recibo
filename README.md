# Recibo

**Español** · [English](README.en.md)

App Android privada que convierte los correos de alerta de tu banco en un registro de gastos. Vinculas tu Gmail u
Outlook, y cada compra, retiro o transferencia que el banco te notifica por correo aparece sola en la app, sumada al
gasto de la semana y del mes, con presupuesto, categorías, historial y avisos al 80 % y al 100 %.

Es un proyecto personal para un grupo pequeño de usuarios: no está en tiendas, el registro está cerrado y se instala
como APK. Política de privacidad: <https://oct4vius.github.io/Recibo/privacidad.html>.

## Qué hace

- **Vincula cuentas de correo** Gmail y Outlook/Hotmail con permiso de solo lectura. El teléfono nunca guarda tokens de
  correo: la app entrega el código de autorización al servidor, que guarda el refresh token en Supabase Vault.
- **Lee solo los correos del banco.** Cada 15 minutos el servidor busca correos nuevos de remitentes bancarios
  conocidos, los interpreta con reglas por banco y plantilla, y guarda las transacciones sin duplicar.
- **Lleva la cuenta.** Gasto de la semana (desde el lunes) y del mes, comparado con el período anterior; presupuesto
  semanal y mensual; categorías automáticas por reglas de comercio; historial por semana, mes y año; gastos manuales.
- **Dólares a pesos.** Los gastos en USD se convierten con la tasa de venta del Banco Central del día del gasto (con una
  tasa de respaldo configurable si no hay publicada).
- **Reversas.** Una compra reversada se empareja con su reversa por monto exacto y deja de contar.
- **Avisos de presupuesto** locales al cruzar el 80 % y el 100 %, una sola vez por umbral y período, sin montos en el
  texto.

### Bancos

| Banco | Estado |
|---|---|
| BHD | Compras, reversas, retiros de cajero, reservas de fondos, transferencias y pagos de servicios |
| Banreservas, Popular, APAP | Candidatos: sus correos se guardan sin interpretar hasta tener una muestra real |

Agregar un banco o una plantilla nueva es crear un archivo y registrarlo; la receta completa está en
[`docs/agregar-banco.md`](docs/agregar-banco.md).

## Cómo funciona

```
Teléfono (Expo)                       Supabase
─────────────────                     ──────────────────────────────────────────────
login (email + contraseña)  ───────▶  Auth (registro cerrado)
vincular correo (código)    ───────▶  link-account ──▶ refresh token en Vault
                                      pg_cron cada 15 min ──▶ sync-mail
                                          Gmail / Graph ──▶ parsers ──▶ ingest_transactions
                                      pg_cron 2 veces al día ──▶ fetch-usd-rates (BCRD)
pantallas (TanStack Query)  ◀───────  Postgres con RLS + RPC de agregados
tarea en segundo plano      ───────▶  claim_budget_alerts ──▶ notificación local
```

- **Seguridad:** RLS en todas las tablas (`user_id = auth.uid()`); la app usa la anon key y solo las Edge Functions usan
  service role. Los secretos viven en `supabase secrets` y nunca en la app.
- **Dinero:** `numeric(14,2)` y sumas en SQL. Qué cuenta como gasto y la fórmula de conversión están definidas una sola
  vez en vistas (`spending_transactions`, `transactions_with_rate`).
- **Costo:** todo dentro del plan gratuito de Supabase y Expo.

## Stack

- **App:** Expo (managed) + Expo Router, React Native, TypeScript estricto, NativeWind, TanStack Query,
  `@supabase/supabase-js`, `expo-notifications` + `expo-background-task`.
- **Backend:** Supabase (Postgres 17, RLS, Vault, `pg_cron`, `pg_net`) y Edge Functions en Deno.
- **Correo:** Microsoft Graph (PKCE, cliente público) y Gmail API (`serverAuthCode`).
- **Herramientas:** Bun, Vitest, `deno test`, pgTAP, EAS Build, GitHub Actions.

## Estructura

```
app/                  rutas de Expo Router (solo navegación y composición)
src/features/<dominio>/  lógica por dominio: api, hooks, componentes
src/components/       componentes de interfaz genéricos
src/lib/, src/theme/  utilidades (dinero, fechas, env) y tema visual
supabase/migrations/  SQL versionado
supabase/tests/       pgTAP
supabase/functions/   Edge Functions (link-account, unlink-account, sync-mail, fetch-usd-rates)
  _shared/parsers/    un archivo por banco y plantilla, con sus fixtures
  _shared/mail/       proveedores de correo (Gmail, Graph)
scripts/              herramientas de desarrollo
tests/unit/           Vitest
docs/                 alcance, receta para bancos, specs de diseño
```

## Desarrollo

### Requisitos

- [Bun](https://bun.sh) (gestor de paquetes y scripts; no se usa npm, yarn ni npx)
- [Deno](https://deno.com) 2 (tests y lint de las Edge Functions)
- Docker Desktop (Supabase local)
- Una cuenta de Expo para compilar con EAS

### Primeros pasos

```bash
bun install
```

1. Copia `.env.example` a `.env.local` y `supabase/functions/.env.example` a `supabase/functions/.env` con tus valores.
   Las variables `EXPO_PUBLIC_*` son públicas (viajan dentro del APK); los secretos van solo en
   `supabase/functions/.env` y, en el remoto, con `supabase secrets set`.
2. Levanta la base local y aplica migraciones y datos de prueba:

   ```bash
   bun run db:start
   ```

   ```bash
   bun run db:reset
   ```

3. Sirve las Edge Functions en local:

   ```bash
   bun run functions:serve
   ```

4. Compila una build de desarrollo (Expo Go no sirve: el retorno de OAuth usa el esquema propio `recibo://`) e inicia
   Metro:

   ```bash
   bunx eas-cli build --profile development --platform android
   ```

   ```bash
   bun run start
   ```

En local no hay cron: el sync se dispara a mano con `bun run dev:sync`, y una cuenta se puede vincular desde la terminal
con `bun run dev:link-outlook` o `bun run dev:link-gmail`.

### Comandos

| Comando | Qué hace |
|---|---|
| `bun run check` | typecheck + Vitest + `deno test` + lint; obligatorio antes de dar algo por terminado |
| `bun run check:db` | reinicia la base local y corre pgTAP; obligatorio si cambian migraciones o tests SQL |
| `bun run db:types` | regenera los tipos de la base tras una migración |
| `bun run fixtures:build` | genera las fixtures de los parsers desde `.eml` locales anonimizados |
| `bun run dev:download-eml` | baja los correos que no se pudieron interpretar, para escribir su plantilla |
| `bun run eml:anonymize` | anonimiza un `.eml` antes de usarlo como fixture |
| `bun run verify:bundle` | empaqueta Android sin dispositivo para validar Metro, Babel y NativeWind |

### Builds

| Perfil | Uso |
|---|---|
| `development` | build de desarrollo con Metro |
| `preview` | APK de prueba |
| `production` | APK final (versión de `app.json`) |

```bash
bunx eas-cli build --profile preview --platform android
```

## Contribuir

Las reglas del proyecto (arquitectura, seguridad, tests y convenciones) están en [`CLAUDE.md`](CLAUDE.md) y el alcance
en [`docs/ALCANCE.md`](docs/ALCANCE.md); lo que está fuera de alcance no se implementa. El trabajo va en la rama `dev` y
llega a `main` por PR con CI en verde. El repositorio es público: nunca se versionan correos reales, `.eml`, tokens ni
archivos `.env`.
