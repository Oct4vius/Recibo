# Plan 3c — Tasa del dólar del BCRD

Fecha: 2026-10-15. Spec de la app: `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md`.
Contexto previo: roadmap "Tasa del dólar del BCRD (2026-10-09)" y `docs/ALCANCE.md` §3.

## 1. Intención

El BHD avisa los gastos en dólares solo en dólares (suscripciones, compras en línea). Hoy la app los convierte a
pesos para los totales con una tasa fija que el usuario escribe en Ajustes. El 3c usa la **tasa de venta del BCRD del
día de cada gasto**, porque es la referencia oficial y el usuario no conoce la tasa que le cobra el BHD. Además, cada
gasto en dólares muestra con discreción su equivalente en pesos con la tasa que tuvo ese día.

### Metas
- Una tabla de tasas diarias del BCRD (venta), llenada automáticamente una vez al día y con historial hacia atrás
  desde la primera transacción en USD.
- `spending_transactions.amount_dop` convierte cada gasto en USD con la tasa de su fecha local. Inicio, Historial y
  Presupuesto cambian solos, porque ya suman esa columna.
- La tasa manual de Ajustes **queda como respaldo**: se usa solo si no hay ninguna tasa del BCRD para esa fecha o
  anterior.
- En Movimientos, cada fila en USD muestra debajo del monto `≈ RD$ 896.26` (opción **A**, elegida por el usuario con
  mockups). El panel del movimiento muestra la tasa usada y su fecha, o "tasa de Ajustes" si fue el respaldo.

### No metas
- La tasa de compra, otras monedas, o la tasa real que cobra el BHD.
- Guardar el monto convertido en la transacción: la conversión se calcula al consultar, así que los gastos pasados
  también quedan con la tasa de su día.
- Push o presupuestos (4c).

### Anti-metas
- Dos fórmulas de conversión (una en SQL y otra en la app). La regla vive en un solo lugar.
- Que una falla del BCRD rompa totales: siempre hay respaldo.
- Que el equivalente en pesos compita visualmente con el monto real.

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Tasa | **Venta** del mercado spot del BCRD (decisión del usuario). |
| Fuente | **Resuelto por el spike (2026-10-15): archivo histórico del BCRD**, sin token ni sesión. Se descartó la API del BCRD (`apibcrd.bancentral.gov.do`, portal Angular que exige registro) y la tabla de la DGII (último recurso, innecesaria). El archivo "Tasas de cambio del dólar de referencia del mercado spot" se descarga con un GET anónimo y trae una hoja `Diaria` con `Año | Mes | Día | Compra | Venta` desde 1991. El lector no usa dependencias: abre el xlsx (zip + XML) con `DecompressionStream`. |
| Muestra de la fuente | `SOURCE_ID = bcrd`. URL: `https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx`; método `GET`, sin headers ni token (no hay secreto de la fuente). Formato `xlsx`; dependencia de parseo: **ninguna** (zip mínimo propio + `DecompressionStream('deflate-raw')`). Fixture: `supabase/functions/_shared/rates/fixtures/bcrd-2026-10-15.xlsx` (289 KB; el xlsx real sin metadatos personales: se quitaron autor y último editor de `docProps`, el correo del propietario de la etiqueta, la ruta interna de red y las partes `customXml`/`printerSettings`; las hojas de datos están intactas). Hoja `Diaria`, columnas A=Año, B=Mes (texto `Ene`..`Dic`, a veces con espacio final), C=Día, D=Compra, E=**Venta** (floats con ruido, p. ej. `61.114899999999999`). Valores: `FIRST = (1991-01-02, venta 11.5)`; `PINNED = (2026-09-07, compra 58.5789, venta 58.9622)`; `MISSING = 2026-09-12` (sábado); `LAST = 2026-10-13`; filas: 8982 (fechas únicas y ordenadas). Publicación observada: `Last-Modified` del archivo = 2026-10-13 21:51 UTC (17:51 hora dominicana) con la tasa de ese mismo día como última fila; a las 23:30 del 15 de oct. el archivo aún no traía el 14 ni el 15 (puede haber retraso de días: la ventana de descarga con 7 días de margen lo cubre). Los fines de semana no se publican desde 1999 (excepto datos viejos de 1999). |
| Días sin publicación | Fines de semana y feriados usan la **última tasa anterior** a esa fecha. |
| Fecha de un gasto | La fecha local del gasto en la zona del perfil (`occurred_at at time zone profiles.timezone`), igual que los límites de semana y mes. |
| Respaldo | `profiles.usd_rate` cuando no hay ninguna tasa del BCRD en o antes de esa fecha. |
| Almacenamiento | Tabla global `usd_rates (rate_date date primary key, sell numeric(10,4) not null, source text, fetched_at timestamptz)`. RLS activado: `select` para `authenticated`; escribe solo `service_role`. Es una tabla de referencia sin `user_id` (excepción documentada, como las categorías por defecto). |
| Una sola fórmula | Una función SQL (p. ej. `public.usd_rate_on(p_user uuid, p_at timestamptz)` → tasa, fecha de la tasa, origen `bcrd`/`manual`) que usan tanto `spending_transactions.amount_dop` como la lista de Movimientos. La app nunca multiplica. |
| Carga diaria | Edge Function `fetch-usd-rates` llamada por `pg_cron` dos veces al día (mañana y tarde, hora dominicana), con su propio secreto, igual que `sync-mail`. Upsert idempotente; la primera corrida rellena el historial desde el día 1 del mes anterior a la transacción USD más antigua. |
| Nombres finales (implementación) | Vista `transactions_with_rate` (todas las columnas de `transactions` + `amount_dop`, `usd_rate`, `usd_rate_date`, `usd_rate_origin`); `usd_rate_on(user, at)`; `usd_rates_fetch_window(today)` (ventana de descarga); `invoke_fetch_usd_rates()`; cron `fetch-usd-rates` a las 09:00 y 19:00 hora dominicana (`'0 13,23 * * *'`: el archivo del BCRD aparece hacia las 17:50); rótulo de Ajustes "Tasa de respaldo" con la línea "Última tasa BCRD: 59.12 (7 sep)." |
| Fila de Movimientos | Segunda línea bajo el monto: `≈ RD$ 896.26`, alineada a la derecha, 13 px (`typeScale.caption`), `fonts.amount` con números tabulares, color `ash`, derecha (nunca inclinada, como todo monto), sin animación (es una lista que se mira muchas veces). Formateada con `formatMoney`. Las filas atenuadas siguen en `ash`. La reversa usa el mismo signo que su monto. Lectores de pantalla: la etiqueta de la fila agrega "aproximadamente <monto en pesos>". |
| Panel del movimiento | Bajo el monto: `≈ RD$ 896.26 · tasa BCRD del 7 sep: 59.12`, o `· tasa de Ajustes: 60.00` si se usó el respaldo. |
| Ajustes | El campo de tasa manual se rotula como respaldo (p. ej. "Tasa de respaldo (si el BCRD no publica)"). Mostrar la última tasa del BCRD con su fecha es decisión de Claude (informativo, una línea). |

## 3. Componentes

- Migración: `usd_rates` + RLS, función de tasa por fecha, `spending_transactions.amount_dop` reescrita con ella,
  exposición de la tasa por fila para la lista (vista con `security_invoker` o columnas calculadas; la forma la elige el
  implementador sin duplicar la fórmula ni romper la paginación por `(occurred_at, id)`), cron e `invoke_fetch_usd_rates()`
  con URL y secreto en Vault (mismo patrón que `invoke_sync_mail`).
- `supabase/functions/fetch-usd-rates/` (`handler.ts` testeable + `index.ts`) y un lector de la fuente en
  `_shared/rates/` (función pura que convierte la respuesta de la fuente en `{ date, sell }[]`, probada con una
  fixture real de la fuente guardada en el spike).
- App: `features/transactions` (mapeo de la fila con el equivalente, panel), `components/SkewRow` (línea opcional bajo
  el monto), Ajustes (rótulo del respaldo y última tasa). Revisar en la galería (`/dev/gallery`).
- `bun run db:types` tras la migración.

## 4. Pruebas

- pgTAP: tasa del mismo día; sábado/domingo/feriado toma la anterior; sin tasa anterior → `profiles.usd_rate`;
  gasto en DOP no cambia; zona del perfil decide la fecha (un gasto a las 23:30 en Santo Domingo es de ese día aunque
  en UTC sea el siguiente); totales de `get_spending_summary` con dos tasas distintas en la misma semana; RLS de
  `usd_rates` (authenticated lee, no escribe; anon nada).
- Deno: lector de la fuente con la fixture del spike (incluye un día faltante y valores con coma/punto);
  handler con fuente falsa (idempotente, relleno de historial, falla de la fuente no borra nada).
- Vitest: presentación de la fila (USD con equivalente, DOP sin él, reversa con signo, respaldo marcado).

## 5. Pasos del usuario

Aprobar el spike de la fuente (y crear un token si el BCRD lo exige), y cada paso remoto: migración, secretos,
deploy, valores de Vault del cron, build.

## 6. Riesgos

- Que el BCRD no tenga una fuente automática estable: el spike lo decide; el respaldo manual cubre fallas.
- Cambios de formato de la fuente: el lector falla en vez de guardar un número dudoso (nunca adivinar, como los
  parsers), y queda registro.

## 7. Decisiones de Claude tras la revisión del diseño

- La línea `≈ RD$` aparece en **toda** fila en USD de Movimientos (también ignoradas, reversas y las que no cuentan
  como gasto): la lista lee `transactions` directamente, y la tasa sale de la misma función que usa `amount_dop`.
- La regla de "fecha local del gasto" vive solo dentro de esa función.
- Un gasto en USD de hoy puede convertirse con la tasa de ayer hasta que el BCRD publique la de hoy; al publicarse,
  el total se ajusta solo. Se acepta.

## 8. Lo que queda al implementador

Nombres finales, horario exacto del cron, forma de exponer la tasa a la lista sin duplicar la fórmula, y el texto
exacto del rótulo de Ajustes, siempre con tests primero.
