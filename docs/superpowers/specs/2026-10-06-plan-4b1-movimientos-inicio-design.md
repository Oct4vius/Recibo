# Plan 4b-1 — Movimientos e Inicio con datos reales

**Fecha:** 2026-10-06 · **Estado:** aprobado en brainstorming
**Rama:** `dev` · **Hereda:** `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md` (dirección visual,
tokens, movimiento, reglas innegociables §3.1). **Depende de:** Plan 2 (esquema, RLS, RPC) y Plan 4a
(fundación y componentes).

## 1. Contexto y decisiones

- El Plan 4b se partió en dos: **4b-1** (este spec: arranque estructural, Movimientos, Inicio) y
  **4b-2** (Historial, Presupuesto, Categorías y reglas, Ajustes).
- 4b-1 termina con el ciclo completo: el usuario registra un gasto manual y lo ve en la lista y en los
  totales de la semana y el mes.
- Los únicos datos que existen hoy son gastos manuales; los importados por correo llegan con el
  Plan 3. Las pantallas los soportan desde ya (filtro de banco, "Revisar", no borrables).
- El estilo (validado por el usuario en el dispositivo: "reactiva y suave") se mantiene tal cual.
- **No** hay interruptor de animaciones dentro de la app: se respeta solo el ajuste de Android.

| Tema | Decisión |
|---|---|
| Efectivo | **El retiro de cajero es el gasto.** Los gastos manuales son para lo que no pasa por el banco. Sin cambios en la base de datos |
| Tipo de un gasto manual | `type = 'card_purchase'`, `source = 'manual'` (el enum no tiene "efectivo"; decisión ya registrada en el roadmap) |
| Fecha de un gasto manual | Chips **Hoy / Ayer / Otro día**; "Otro día" abre el selector nativo de Android. La hora es la del registro |
| Monto | **Teclado numérico propio** (teclas inclinadas, vibración) con el monto gigante arriba; trabaja en centavos enteros |
| Disposición del panel | Monto → moneda → comercio → categorías (3 recientes + "Más…") → fecha → teclado → "Guardar" (mockup aprobado) |
| Migraciones | **Ninguna.** Las políticas del Plan 2 ya permiten insertar manuales, editar monto/comercio/categoría/ignorado y borrar solo manuales |

## 2. Arranque estructural (pedido por la revisión final del 4a)

1. **`SessionProvider`** en `app/_layout.tsx`: una sola lectura de la sesión compartida por contexto.
   `useSession()` y `useUserId()` leen el contexto. En el evento `SIGNED_OUT` (por cualquier vía) se
   ejecuta `queryClient.clear()`.
2. **`Screen` con dos modos:** `scroll` (actual) y `list` (un `FlatList` con el título como
   `ListHeaderComponent`, fondo y forma de pestaña iguales). Ambos con
   `keyboardShouldPersistTaps="handled"`.
3. **`TextField`** acepta `TextInputProps` (sin `style`), con `autoCapitalize`/`autoCorrect`
   configurables (por defecto los actuales) y un `error` opcional mostrado bajo el campo con live region.
4. **Fechas (`src/lib/dates.ts`):** el weekday se deriva de y/m/d con `Date.UTC(...).getUTCDay()`; un
   `Intl.DateTimeFormat` cacheado por zona; una zona inválida cae a `America/Santo_Domingo`.
5. **`SkewRow`** envuelto en `React.memo`.

## 3. Capa de datos (TanStack Query, keys por dominio en `keys.ts`)

| Dominio | Lecturas | Mutaciones |
|---|---|---|
| `transactions` | Lista paginada con `useInfiniteQuery`: páginas de 50 con `.range()` + `count: 'exact'`, orden `occurred_at desc, id desc`. Últimos 5 para Inicio | Crear manual, editar (monto, comercio, categoría), ignorar/contar (`is_ignored` + `ignored_reason` juntos: `'user'` / `null`), borrar (solo manuales) |
| `summary` | `get_spending_summary('week')` y `('month')` | — |
| `categories` | Por defecto (`user_id is null`) + propias, orden por nombre; "recientes" = las 3 categorías distintas de los últimos 30 movimientos del usuario (selección, no agregado: no viola la regla de agregados en SQL); si hay menos de 3, se completa con las primeras por nombre | — |
| `budgets` | Presupuesto activo semanal y mensual (lectura) | — |
| `profile` | `primary_currency`, `timezone` | — |

Toda mutación invalida `transactions`, `summary` (y `categories` si cambia la frecuencia). No se
actualiza estado local a mano.

## 4. Movimientos

- `Screen` en modo `list`. Lista agrupada por día con encabezados inclinados ("HOY", "AYER",
  "MAR 06 / OCT"); filas `SkewRow` (comercio o "Sin descripción", categoría, monto en su moneda).
  Ignorados en `ash` con la etiqueta "Ignorado"; manuales con la marca "Manual".
- Paginación al llegar al final; *pull to refresh*; vacío: "Todavía no hay movimientos. Agrega tu
  primer gasto con +".
- **Filtros** (chips inclinados): período Esta semana / Este mes (por defecto) / Todo; Categoría,
  Moneda y Banco abren un `SlamSheet` de opciones; "Revisar" = `ignored_reason = 'unmatched_reversal'`.
  Se muestra el conteo total ("38 movimientos"). Los límites de semana/mes se calculan en la zona del
  perfil con las mismas reglas que las RPC (semana desde el lunes).
- **Botón "+"** (rombo rojo inclinado, abajo a la derecha, 56 dp, etiqueta "Agregar gasto") abre el
  panel de gasto.

## 5. Panel de gasto (crear y editar)

`SlamSheet` con el orden del mockup aprobado:
1. Monto gigante (Barlow Condensed, cifras de ancho fijo) con cursor rojo.
2. Moneda RD$ / US$ (por defecto `profiles.primary_currency`).
3. Comercio o descripción (`TextField`, opcional, máx. 80 caracteres). Al enfocarlo, el teclado propio se
   oculta y aparece el de Android.
4. Categorías: las 3 usadas más recientemente + "Más…" (abre la lista completa en otro `SlamSheet`).
5. Fecha: Hoy / Ayer / Otro día (selector nativo `@react-native-community/datetimepicker`, máximo hoy).
6. Teclado propio: 1–9, punto, 0, borrar. Reglas: máximo 2 decimales, sin ceros a la izquierda, tope
   RD$/US$ 9,999,999.99, el punto solo una vez.
7. "Guardar" (deshabilitado hasta tener monto > 0; errores en español bajo el botón).

**Editar** (tocar una fila): mismo panel precargado. Se pueden cambiar monto, comercio y categoría; la
fecha y la moneda de un importado por correo no se editan (son datos del banco); en un manual sí.
Botón "Ignorar este gasto" / "Contar este gasto". Botón "Borrar" solo en manuales, con confirmación
("¿Borrar este gasto? No se puede deshacer.").

## 6. Inicio

1. Fecha de hoy en la etiqueta blanca inclinada (`formatDayLabel`).
2. Título "ESTA SEMANA" en nota de rescate.
3. Total de la semana en monto héroe; debajo, comparación con la semana pasada en texto
   `paper`/`ash` ("RD$ 612.30 más que la semana pasada", "… menos …", "Igual que la semana pasada").
   Sin rojo ni verde.
4. `JaggedProgress` del presupuesto semanal activo; si no hay, enlace "Define un presupuesto semanal"
   a la pestaña Presupuesto.
5. Bloque "ESTE MES" (más chico): total, comparación y barra del presupuesto mensual si existe.
6. "ÚLTIMOS MOVIMIENTOS": 5 filas; "Ver todos" lleva a Movimientos.
7. Botón "+" igual que en Movimientos.
- Carga: placeholders con forma de tira. Error: "No se pudieron cargar tus totales. Tira hacia abajo
  para reintentar".

## 7. Pruebas, accesibilidad y riesgos

- **Vitest:** reductor del teclado; conversión Hoy/Ayer/Otro día → `occurred_at` en la zona del perfil
  (incluye cerca de medianoche); filtros → rango de fechas y parámetros de consulta; agrupación por
  día; texto de comparación; weekday/caché/zona inválida de `dates.ts`; conversión de centavos a texto
  decimal.
- **pgTAP:** no aplica (sin migraciones).
- **Dispositivo:** checklist `docs/superpowers/plans/2026-10-06-plan-4b1-device-checklist.md`.
- **Accesibilidad:** teclas con etiqueta ("Borrar", "Punto decimal"); el monto se anuncia completo; "+"
  = "Agregar gasto"; chips anuncian estado; áreas ≥ 48 dp.
- **Riesgos:** coma flotante → centavos enteros y monto enviado como texto decimal exacto; selector de
  fecha → `bunx expo install`; listas largas → `FlatList` paginado + `SkewRow` memo; USD → la fila
  muestra la moneda original y los totales vienen en DOP de la RPC.

## 8. Fuera de 4b-1

Historial, crear/editar presupuestos, categorías y reglas, Ajustes completos (4b-2); ceremonias,
sonidos, push y APK (4c); sincronización (Plan 3).
