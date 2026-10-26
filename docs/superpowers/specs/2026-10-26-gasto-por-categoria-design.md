# Gasto por categoría en Historial

Fecha: 2026-10-26. Spec de la app: `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md` (estilo visual) y
`2026-10-09-plan-4b2-historial-presupuesto-ajustes-design.md` (Historial actual). Alcance: `docs/ALCANCE.md`.

## 1. Intención

Ver cuánto se ha gastado en cada categoría. **Sobre todo durante el mes en curso**, para frenar a tiempo, y también al
final, para revisar en qué se fue el dinero: en meses anteriores y en el total de siempre (pedido del usuario).

Hoy la app no suma por categoría en ningún lado: Inicio y Historial dan totales por período y Movimientos filtra por
categoría, pero no suma.

### Metas
- **Vive en Historial** (decisión del usuario; se descartó un bloque en Inicio con pantalla propia).
- **Historial abre en MES** (decisión del usuario; hoy abre en SEMANA).
- Debajo de las barras, el **desglose por categoría del período elegido**: monto en RD$, % del total del período y
  cantidad de gastos, de mayor a menor.
- Funciona igual en **SEMANA, MES y AÑO**, y en meses/semanas/años anteriores con "‹ Anteriores" (decisión de Claude: la
  misma regla para las tres granularidades).
- Un chip nuevo **TODO**: total desde el primer gasto y su desglose por categoría (pedido del usuario).
- Tocar una categoría abre **Movimientos filtrado por esa categoría y ese período**.

### No metas
- Gráficos de torta, comparaciones contra el mes anterior o tendencias por categoría.
- Presupuesto por categoría (no está en el alcance de la v1).
- Cambios en Inicio.
- Desglose por subcategoría, banco o moneda.

### Antimetas (sería un fracaso aunque funcione)
- Que la suma de las categorías **no cuadre** con el total del período que muestra la app (barras e Inicio).
- Que el desglose sume en JS o repita el filtro de "qué es gasto" fuera de `spending_transactions`.
- Que Historial se sienta más lento o más animado al cambiar de período (se mira seguido).

## 2. Comportamiento

Maqueta de referencia (no versionada): `.superpowers/brainstorm/*/content/history-categories-v2.html`.

### 2.1 SEMANA / MES / AÑO
Orden de la pantalla, de arriba abajo:

1. Chips **SEMANA · MES · AÑO · TODO** (MES elegido al abrir).
2. Barras de la ventana (igual que hoy: 8 semanas, 6 meses o 3 años) y "‹ Anteriores" / "Siguientes ›".
3. **Encabezado del período elegido**: nombre del período (la misma etiqueta que `bucketLabel`), insignia "Actual" si es
   el período en curso, total en grande y "N gastos". Debajo, un botón fantasma **"Ver movimientos ›"** que abre
   Movimientos con el rango del período, sin categoría (decisión de Claude: hoy ese salto lo da tocar el período en la
   lista; ver 2.3).
4. **Desglose por categoría** del período elegido (ver 2.4).
5. La lista de períodos de la ventana que ya existe, bajo un `SectionHeader` ("Semanas", "Meses", "Años").

**Período elegido por defecto** (decisión de Claude): el período actual si está en la ventana; si no (después de
"‹ Anteriores"), el más nuevo de la ventana. Cambiar de granularidad o de ventana vuelve a esa regla.

### 2.2 Elegir período
Tocar una barra **o** un período de la lista lo elige: la fila queda `selected` (tira blanca, como hoy) y el encabezado y el
desglose cambian a ese período.

### 2.3 Cambio de comportamiento en la lista de períodos
Hoy tocar un período de la lista navega a Movimientos. **Ahora lo elige** (2.2). A Movimientos se llega con
"Ver movimientos ›" o tocando una categoría.

### 2.4 Filas del desglose
- Una fila por categoría con gasto > 0 en el período: **nombre** (izquierda), **monto RD$** (`Amount`/`formatMoney`,
  derecho), una **barrita** con el % del total del período y debajo, en `ash`, "**32 %**" y "**9 gastos**" / "**1 gasto**".
- Orden: monto descendente; empate por nombre. **"Sin categoría" siempre al final** y su barrita en `ash` (decisión de
  Claude: que se note que falta asignar, sin competir con las demás).
- El % se redondea a entero para mostrar; puede no sumar 100 exacto (aceptado). Una categoría con menos de 0.5 % muestra
  "<1 %".
- Barrita en `blood`, sobre fondo `panel`. Es una tira de `SkewRow` (misma inclinación y `usePressNudge`) con la barrita
  dentro; componente nuevo en `src/features/history/components/` (un componente por archivo).
- Solo aparecen categorías que cuentan como gasto (las demás ya las excluye `spending_transactions`): "Transferencias
  propias" nunca aparece.
- **Tocar** una fila → Movimientos con `period` = rango del período (o `all` en TODO) y `categoryId` = esa categoría.
  "Sin categoría" → Movimientos con el filtro nuevo "Sin categoría" (ver 3.3).
- Sin icono ni color de la categoría (decisión de Claude): la paleta es única (`colors.json`) y el rojo de la barrita ya
  ordena la lectura. Se puede sumar después si se echa en falta.
- Período sin gastos: en lugar de filas, "Sin gastos en este período." en `ash`.

### 2.5 TODO
- Sin barras, sin "‹ Anteriores" y sin lista de períodos.
- Encabezado: **"DESDE <MES AÑO>"** del primer gasto que cuenta (fecha local del perfil), total en grande y "N gastos";
  "Ver movimientos ›" abre Movimientos con período "Todo".
- Desglose igual que 2.4 sobre todos los gastos.
- Sin gastos todavía: "Aún no hay gastos." y sin encabezado de fecha.

### 2.6 Carga, errores y refresco
- Las barras y el desglose son consultas separadas. Mientras carga el desglose: `PlaceholderRows` (3 filas). Error: el
  mensaje de error del estilo de Historial ("No se pudo cargar … Tira hacia abajo para reintentar.").
- Tirar hacia abajo refresca barras y desglose.
- Al cambiar de período se muestran los datos anteriores hasta que llegan los nuevos (`placeholderData` como hace hoy
  `useHistory`), sin parpadeo de placeholders.

### 2.7 Movimiento (criterios de Emil Kowalski aplicados)
- Las cifras cambian **al instante** al elegir otro período: es una acción frecuente, la animación la haría sentir lenta.
- Las barritas se llenan **una vez** al llegar datos nuevos con `animateTo(..., 'snap', reduced)` de `src/theme/motion.ts`
  (como `JaggedProgress`), sin rebote. Con "reducir animaciones" aparecen llenas.
- Las filas no entran escalonadas ni con `slam`: el desglose cambia muy seguido. El título de la pantalla conserva su
  entrada actual.
- Retroalimentación al tocar: la de `SkewRow` (`usePressNudge` + háptico), nada nuevo.

## 3. Datos

### 3.1 RPC `get_category_spending(p_from date, p_to date)`
- Devuelve `(category_id uuid, category_name text, total_dop numeric, tx_count integer)`, una fila por categoría con gasto,
  y una fila con `category_id` y `category_name` null para "Sin categoría". El orden lo decide la app (2.4).
- `p_from` inclusivo, `p_to` **exclusivo**, en **fecha local** de la zona del perfil (como `get_history`, que agrupa por
  `(occurred_at at time zone tz)::date`). **Ambos null = todo.** Uno solo null, o `p_from >= p_to` → 22023. Sin tope de
  rango: el resultado está acotado por la cantidad de categorías, no por el rango.
- `security invoker`, `auth.uid()` obligatorio (42501 sin sesión), `set search_path = ''`. Suma `amount_dop` de
  `public.spending_transactions` filtrando `user_id = auth.uid()`; el nombre sale de `categories`.
- EXECUTE solo para `authenticated` (revocado de `public`, `anon`).
- Para el encabezado de TODO, la misma RPC no basta: se agrega **`first_spending_date()`** (fecha local del primer gasto que
  cuenta, null si no hay) o se devuelve en otra columna; decisión del constructor, con su pgTAP.

### 3.2 Vista `spending_transactions`
Hoy no expone `category_id`. Se recrea con `category_id` **agregado al final** (`create or replace view` lo permite) y el
mismo filtro. Ninguna otra regla cambia.

### 3.3 Movimientos
- `TransactionsScreen` acepta además `?categoryId=<uuid>` o `?categoryId=none` y lo aplica junto con el rango, una vez,
  igual que hoy `from/to/label` (`rangeFromParams`). TODO navega con `period = 'all'`.
- `TransactionFilters.categoryId` admite el valor `'none'` → `.is('category_id', null)`. El selector de categoría del
  filtro gana la opción "Sin categoría".
- Movimientos sigue mostrando también los ignorados y los que no cuentan (atenuados, como hoy), así que la lista puede
  tener filas que el desglose no sumó. Aceptado: es el comportamiento actual de Movimientos.

### 3.4 Caché
La consulta del desglose tiene su key en `src/features/history/keys.ts` y se invalida en `invalidateSpending`
(`src/features/transactions/invalidate.ts`), igual que Historial: editar, ignorar o recategorizar un movimiento, borrar
una categoría o guardar una regla cambia el desglose. Cambiar la zona o la tasa ya invalida todo.

### 3.5 Coherencia con el total
La suma de `total_dop` de todas las filas de `get_category_spending(from, to)` es igual al total de `get_history` para ese
período, y el total de TODO es igual a la suma de todos los gastos de `spending_transactions` del usuario. pgTAP lo prueba.

## 4. Pruebas
- **pgTAP** (`supabase/tests/get_category_spending.test.sql`):
  - suma por categoría y "Sin categoría";
  - excluye ignorados, reversas y categorías con `counts_as_spending = false`;
  - USD convertido con `amount_dop`;
  - límites en la zona del perfil (un gasto a las 23:30 del último día del mes cae en ese mes);
  - solo filas del propio usuario (otro usuario con gastos no aparece);
  - null/null = todo; rango inválido → 22023; sin sesión → 42501;
  - cuadra con `get_history`;
  - EXECUTE no está concedido a `anon`.
- **Vitest** para la lógica pura nueva:
  - mapeo de filas;
  - orden (monto desc, empate por nombre, "Sin categoría" al final);
  - % con "<1 %";
  - período elegido por defecto;
  - params de navegación a Movimientos;
  - filtro `'none'`.
- Sin tests de pantallas (política del proyecto). Los componentes nuevos se revisan en `/dev/gallery`.
- `bun run check` y `bun run check:db`; `bun run db:types` después de la migración.

## 5. Lo que decide el constructor
- Nombres de archivos, hooks y `queryKeys` dentro de `src/features/history/` (siguiendo las convenciones de CLAUDE.md).
- Cómo obtener la fecha del primer gasto para TODO (3.1).
- Etiquetas exactas de accesibilidad de las filas (deben leer nombre, monto, % y cantidad).
