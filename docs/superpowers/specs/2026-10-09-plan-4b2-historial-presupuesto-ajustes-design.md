# Plan 4b-2 — Historial, Presupuesto, Categorías y reglas, Ajustes

**Fecha:** 2026-10-09 · **Estado:** aprobado en brainstorming (secciones 1–6), pendiente de revisión del spec
**Rama:** `dev` · **Hereda:** `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md` (dirección visual,
tokens, movimiento, reglas innegociables §3.1). **Depende de:** Plan 2 (esquema, RLS, RPC), Plan 4a y
Plan 4b-1 (fundación, componentes, Movimientos, Inicio, panel de gasto).

## 1. Contexto y decisiones

- 4b-2 termina con la app configurable sin tocar el Table Editor de Supabase: presupuestos, categorías
  propias, reglas, preferencias de aviso, tasa, zona horaria y contraseña desde la app.
- Hoy solo existen gastos manuales; los del banco llegan con el Plan 3. Todo lo de este spec funciona
  con ambos.
- Estilo y movimiento se mantienen tal cual ("reactiva y suave", aprobado en el dispositivo). Sin
  interruptor de animaciones dentro de la app. Las decisiones de movimiento siguen la skill
  `emil-design-eng` (frecuencia y propósito); la gráfica sigue la skill `dataviz`.

| Tema | Decisión |
|---|---|
| Notificaciones | **Un interruptor por umbral** (80 % y 100 %), global por usuario, en `profiles.alert_thresholds`. Apagar un umbral solo apaga el **push**: el borde amarillo y la `CallingCard` siguen en la app |
| Historial | Selector Semana / Mes / Año, **barras + lista** de la ventana (8 semanas, 6 meses o 3 años); tocar un período abre Movimientos filtrado a ese rango |
| Presupuesto | Bloques **SEMANAL y MENSUAL** a la vez: barra, gastado / límite, cuánto queda y días restantes; límite con el teclado propio; "Quitar presupuesto" |
| Reglas | Se crean **desde un movimiento** ("Siempre poner UBER en Transporte"), del banco **y manuales**; lista en Ajustes → Reglas con "Nueva regla" |
| Al crear una regla | Se aplica a los movimientos existentes **sin categoría**; nunca cambia una categoría ya elegida |
| Dónde viven las reglas | **En la base de datos**: una función de coincidencia, un trigger de insert y una RPC para guardar y aplicar. La app y el sync no repiten la lógica |
| Categorías propias | Nombre + "Cuenta como gasto"; sin ícono ni color (la app no los muestra) |
| Zona horaria | Muestra la guardada y ofrece "Usar la de este teléfono" si difieren; sin lista de zonas |
| Moneda principal | Se rotula "Moneda por defecto al agregar un gasto" (totales y presupuestos siempre en DOP) |
| Tasa del dólar | **Manual** en Ajustes hasta el Plan 3, que la reemplaza por la tasa diaria del BCRD (ver §9) |
| Contraseña | Pide la actual, la verifica y guarda la nueva (`updateUser`); mínimo 10 caracteres |

## 2. Datos (migraciones, una por cambio, cada una con su pgTAP)

### 2.1 Migración A — preferencias de aviso
- `profiles.alert_thresholds integer[] not null default '{80,100}'`, con
  `check (alert_thresholds <@ array[80,100])`. Apagar el 80 % lo deja en `{100}`; ambos apagados, `{}`.
- Se elimina `budgets.thresholds` (ningún código lo lee). El test `budgets_ops.test.sql` que lo usa se
  ajusta en la misma tarea.
- Decisión para el Plan 3 (anotada en el roadmap): `sync-mail` solo envía push de los umbrales presentes
  en el perfil. Un umbral apagado no escribe `budget_alerts`; si se vuelve a encender a mitad de
  período, el aviso puede saltar en la siguiente corrida (aceptado).
- pgTAP: default `{80,100}`; acepta `{100}` y `{}`; rechaza `{50}`; el dueño puede actualizarlo y otro
  usuario no; la columna `budgets.thresholds` ya no existe.

### 2.2 Migración B — zona horaria válida
- Trigger `before insert or update of timezone on profiles` que lanza `22023` si `timezone` no está en
  `pg_timezone_names`. Hoy una zona inválida rompe todas las RPC en `at time zone`.
- pgTAP: acepta `America/New_York`; rechaza `Mars/Olympus`; las filas existentes siguen válidas.

### 2.3 Migración C — reglas
- Índice único `merchant_rules (user_id, match_field, lower(pattern))`.
- `public.match_category(p_user_id uuid, p_merchant text, p_counterparty_last4 text) returns uuid`:
  `stable`, `security invoker`, `search_path = ''`. Devuelve la categoría de la primera regla del usuario
  que coincide:
  - `match_field = 'merchant'`: `strpos(lower(p_merchant), lower(pattern)) > 0` (literal: un `%` o `_`
    del patrón no es comodín).
  - `match_field = 'counterparty_last4'`: igualdad exacta.
  - Orden: `priority asc`, `length(pattern) desc` (el más específico gana), `created_at asc`.
- Trigger `before insert on transactions`: si `new.category_id is null`, asigna
  `match_category(new.user_id, new.merchant, new.counterparty_last4)`. Aplica a manuales y, desde el
  Plan 3, a los del banco. **Solo insert**: editar un gasto no reaplica reglas.
- RPC `public.save_merchant_rule(p_match_field text, p_pattern text, p_category_id uuid, p_rule_id uuid default null)
  returns table (rule_id uuid, applied_count integer)`: `security invoker`, una transacción.
  - Con `p_rule_id`: actualiza esa regla. Sin él: inserta o, si ya existe `(user, match_field,
    lower(pattern))`, actualiza su categoría.
  - Luego aplica la regla a los movimientos del usuario **sin categoría** que coinciden (del banco y
    manuales) y devuelve cuántos cambió.
  - Se usa RPC y no un upsert de PostgREST porque el índice único es de expresión (`lower(pattern)`).
  - `revoke` a `public, anon`; `grant` a `authenticated`.
- pgTAP: manual sin categoría recibe la de la regla; con categoría no se toca; gana el patrón más largo;
  `%` literal; por cuenta destino; nunca reglas de otro usuario; `save_merchant_rule` no duplica "uber" /
  "UBER"; `applied_count` cuenta solo los que estaban sin categoría; rechaza una categoría ajena (RLS);
  `anon` no puede ejecutarla.

### 2.4 Presupuestos (sin migración)
- Guardar = upsert sobre `unique (user_id, period)` con `is_active = true` (reactiva uno quitado).
- "Quitar presupuesto" = `is_active = false` (se conserva el historial de `budget_alerts`).

### 2.5 Cierre de datos
`bun run db:types` (desaparece `budgets.thresholds`, aparecen `alert_thresholds`, `match_category` y
`save_merchant_rule`), `bun run check:db` y `bun run check` en verde.

## 3. Base de la app

1. **`SectionHeader`** (`src/components/`): sale de `DayHeader` de Movimientos (Anton 18, `paper`, −4°,
   rol `header`). Lo usan Movimientos, Ajustes, Presupuesto y las subpantallas.
2. **`SkewToggle`** (`src/components/`): riel inclinado −8°. Apagado: borde `ash`, perilla `ash`.
   Encendido: relleno `blood`, perilla `paper`. La perilla salta con `snap` y vibra (`tap`); con
   "Quitar animaciones", fundido de 120 ms. `accessibilityRole="switch"` y `accessibilityState.checked`;
   toda la fila es tocable (≥ 48 dp). Se revisa primero en la galería.
3. **Perfil** (`src/features/profile/`): `Profile` agrega `usdRate` y `alertThresholds`; mutaciones de
   actualización que invalidan `profileKeys`. Cambiar la zona horaria invalida **todas** las consultas.
4. **Key de movimientos** con `timeZone` (pendiente del 4b-1).
5. **Resumen:** `toSpendingSummary` expone `periodStart` y `periodEnd` (la RPC ya los devuelve).
6. **Valores optimistas sin tocar la caché:** los interruptores muestran `mutation.variables` mientras la
   mutación está pendiente; si falla, vuelven al valor del servidor y muestran el error. No se usa
   `setQueryData` (CLAUDE.md: las mutaciones invalidan sus keys).

## 4. Ajustes

Pantalla con scroll; cada grupo bajo un `SectionHeader`:

| Grupo | Contenido |
|---|---|
| CUENTA | Correo (texto `ash`); fila "Cambiar contraseña" → panel; "Cerrar sesión" (existente) |
| AVISOS DE PRESUPUESTO | Filas "Aviso al 80 %" y "Aviso al 100 %" con `SkewToggle`; nota: "Los avisos llegarán cuando se active la sincronización de correos." |
| DINERO | "Moneda por defecto al agregar un gasto" con chips `RD$` / `US$` (símbolos de `money.ts`); fila "Tasa del dólar · RD$ 60.00 por US$ 1" → panel |
| ZONA HORARIA | Nombre legible de la zona guardada ("Santo Domingo (UTC−4)"); botón "Usar la de este teléfono (Nueva York)" solo si difieren |
| ORGANIZAR | Filas "Categorías" y "Reglas" → subpantallas |
| CUENTAS VINCULADAS | "Gmail y Outlook · próximamente" (atenuado) |
| (solo `__DEV__`) | "Abrir galería" |

- **Cambiar contraseña** (`SlamSheet`): actual, nueva, repetir. Validación pura: nueva ≥ 10 caracteres,
  igual a la repetida, distinta de la actual. Verifica la actual con `signInWithPassword` (el plan
  revisa el efecto del evento `SIGNED_IN` en `SessionProvider`) y guarda con `updateUser({ password })`.
  Éxito: el panel se cierra y se muestra "Contraseña actualizada". Errores: "La contraseña actual no
  es correcta.", "Las contraseñas no coinciden.", "Mínimo 10 caracteres.", sin conexión.
- **Tasa del dólar** (`SlamSheet` + `AmountKeypad`): centavos enteros, 2 decimales, nunca `parseFloat`;
  "Guardar" desactivado en cero. Aviso: "Cambiarla recalcula todos tus totales, incluido el historial."
- **Zona del teléfono:** `expo-localization` (`bunx expo install`); el plan verifica qué devuelve en
  Expo Go. El nombre legible sale de una función pura con tests.
- Error al guardar cualquier ajuste: "No se pudo guardar. Intenta de nuevo." en `signal`.

### 4.1 Subpantallas
Rutas `app/settings/categories.tsx` y `app/settings/rules.tsx` (protegidas por sesión, fuera de las
pestañas), con botón "Atrás" arriba además del Atrás de Android; `ListScreen`.

- **CATEGORÍAS:** grupo "TUYAS" con "Nueva categoría"; tocar una abre el panel (nombre, `SkewToggle`
  "Cuenta como gasto", Guardar, Borrar). Borrar confirma: "¿Borrar «Gym»? Sus movimientos quedan sin
  categoría y se borran sus 2 reglas." Grupo "POR DEFECTO": las 13, no tocables; "Transferencias
  propias" con subtítulo "No cuenta como gasto". Nombre repetido (23505): "Ya tienes una categoría con
  ese nombre."
- **REGLAS:** filas `UBER → Transporte` · "Comercio contiene" y `0099 → Transferencias propias` ·
  "Cuenta destino termina en". Panel: chips Comercio / Cuenta destino, texto (4 dígitos si es cuenta),
  categoría (`CategoryPicker`), Guardar, Borrar. Guardar usa `save_merchant_rule` y muestra bajo el
  título "Regla guardada · se aplicó a 4 movimientos". Sin edición de prioridad.

## 5. Presupuesto

- Dos bloques bajo `SectionHeader` (SEMANAL, MENSUAL). Con presupuesto: `JaggedProgress` (existente),
  "RD$ 4,275.72 de RD$ 6,300.00" y "Quedan RD$ 2,024.28 · 3 días" o "Te pasaste por RD$ 312.00 · 3 días"
  (`paper`, sin rojo en texto chico, sin celebrar). Sin presupuesto: botón "Definir límite semanal".
- El gastado sale de `get_spending_summary` con la misma key que Inicio (caché compartida).
- Lo que queda: resta en centavos enteros en `src/theme/progress.ts`, junto a `progressState`.
- Días restantes = `periodEnd − hoy` en la zona del perfil, contando hoy (viernes → 3), con
  `src/lib/dates.ts`. No se recalculan los límites del período en el cliente.
- Tocar el bloque (respuesta de `SkewRow`) abre "LÍMITE SEMANAL" (`SlamSheet` + `AmountDisplay` +
  `AmountKeypad`, solo `RD$`). Guardar → upsert (§2.4), invalida `budgetKeys.all`. "Quitar presupuesto"
  solo si existe; confirma "¿Quitar el presupuesto semanal? Dejarás de ver la barra y los avisos."
- Estados: `PlaceholderRows` al cargar; tirar para recargar; error "No se pudo cargar tu presupuesto.
  Tira hacia abajo para reintentar."

## 6. Historial

- Chips SEMANA / MES / AÑO. Ventana: 8 semanas, 6 meses o 3 años terminando en el período actual; una
  llamada a `get_history(granularidad, desde, hasta)` (buckets vacíos en cero). "‹ Anteriores" corre la
  ventana un bloque atrás; "Siguientes ›" vuelve. Sin scroll infinito.
- El rango de la ventana sale de `dates.ts`/`filters.ts` (función hermana de `periodRange`, semana desde
  el lunes). Key `historyKeys.window(granularidad, desde, zona)`.
- **Gráfica** (`react-native-svg`):
  - Barras verticales rectas, sin inclinar, radio 0. Una serie, sin leyenda.
  - Grises (`ash`) y la actual en `blood` (validado con el script de `dataviz`: ΔE 15 CVD, 25 normal,
    contraste ≥ 3:1). La actual también se distingue por posición y por "Actual" en la lista.
  - Sin cuadrícula ni eje Y; línea base `ash`. Etiquetas del eje: día+mes / mes / año.
  - Tocar una barra la elige: `paper`, su monto arriba y su fila marcada en la lista; el área de toque
    es la columna completa.
  - Todo en cero: barras planas y "Aún no hay gastos en estos períodos."
  - Accesibilidad: cada barra se anuncia ("Semana del 5 de octubre: 4,275.72 pesos"); la lista es la
    tabla equivalente.
- **Lista:** `SkewRow` con el rango ("05 OCT – 11 OCT", "OCTUBRE 2026", "2026"), conteo y monto; badge
  "Actual". Tocar una fila abre Movimientos filtrado a ese rango.

### 6.1 Movimientos con rango
- El período del filtro admite `{ kind: 'range', from, to }`; chip seleccionado "05 OCT – 11 OCT ✕";
  "Esta semana", "Este mes" o "Todo" lo reemplazan.
- La navegación pasa `from`/`to` como parámetros a la pestaña; la pantalla los convierte en filtro una
  vez y los limpia, para que volver a la pestaña no reaplique el rango.

## 7. "Siempre poner…" en los paneles de gasto

- En NUEVO GASTO y EDITAR GASTO aparece la fila `SkewToggle` "Siempre poner «UBER» en Transporte"
  cuando hay categoría elegida, el movimiento tiene comercio y la categoría difiere de la original.
  Apagada por defecto. Al encenderla aparece "Texto a buscar", prellenado con el comercio y editable.
- `transfer_out` con `counterparty_last4`: "Siempre poner la cuenta …0099 en Transferencias propias"
  (`match_field = 'counterparty_last4'`).
- Lógica de oferta (cuándo, qué patrón, qué campo) en `src/features/rules/offer.ts`, pura y con tests.
- Al guardar: primero el gasto; si la opción está encendida, `save_merchant_rule`. Mensajes: "Gasto
  guardado · la regla se aplicó a 4 movimientos más." / "Se guardó el gasto, pero no la regla. Intenta
  desde Ajustes → Reglas." Invalida movimientos, resumen, historial y presupuesto.
- Gastos manuales nuevos sin categoría: los categoriza el trigger (§2.3); la app no repite la lógica.

## 8. Movimiento, pruebas, accesibilidad y riesgos

**Movimiento (emil-design-eng):**

| Elemento | Decisión | Por qué |
|---|---|---|
| Encabezados, filas, bloques y barras al abrir | Sin animación de entrada; solo el título entra con `slam` | Pantallas frecuentes o de consulta |
| `SkewToggle` | Perilla con `snap` + `tap` | Indica el cambio de estado y confirma el toque |
| Filas y bloques tocables | Respuesta de `SkewRow` (6 px, 90 ms, vibración) | Cohesión |
| Cambio de granularidad o ventana | Alturas con `snap` | Mismo gráfico que cambia, no uno nuevo |
| Opción "Siempre poner…" y su campo | Fundido de 120 ms, sin animar altura | Evita el salto sin animar el layout |
| "Quitar animaciones" | Fundido de 120 ms o instantáneo | Regla del sistema |

**Pruebas:**
- pgTAP por migración (§2).
- Vitest (solo lógica pura): validación de contraseña; nombre legible de zona; tasa en centavos;
  "queda / te pasaste" en centavos (exacto, +1 centavo, cero); días restantes (lunes → 7, domingo → 1,
  fin de mes); ventana de historial por granularidad (bordes de mes y año); etiquetas de rango; rango de
  período para Movimientos; escala de la gráfica (máximo llena la altura; todo en cero no divide entre
  cero); oferta de regla.
- Sin tests de pantallas (política del proyecto).

**Accesibilidad:** interruptores con rol y estado; barras anunciadas con su monto; chips con
`selected`; errores con live region.

**Riesgos:**
- "Secure password change" encendido en el remoto haría que `updateUser` pida un nonce por correo, y no
  hay SMTP. El usuario lo verifica en el dashboard (Authentication → Email) antes de la checklist.
- El largo mínimo de contraseña del remoto debe ser 10, como en local.
- La migración debe estar en el remoto antes de probar en Expo Go.

## 9. Ejecución, remoto y fuera de 4b-2

**Orden** (un subagente Sonnet por tarea, en secuencia sobre `dev`, revisor por tarea; revisión final de
la rama con Opus; una ronda de correcciones):
1. Migración A + pgTAP. 2. Migración B + pgTAP. 3. Migración C + pgTAP + `db:types`.
4. Base de la app (§3). 5. Ajustes (§4). 6. Categorías. 7. Reglas. 8. Presupuesto (§5).
9. Historial (§6). 10. Movimientos con rango (§6.1). 11. "Siempre poner…" (§7).
12. Documentación: convenciones nuevas en `CLAUDE.md` (`SectionHeader`, `SkewToggle`, reglas en SQL,
    preferencias de aviso), roadmap y checklist del 4b-2 en el dispositivo.

Verificación por tarea: `bun run check` (y `check:db` si toca `supabase/`, `verify:bundle` si toca
`app/` o componentes). Al final, los tres en verde.

**Remoto:** `supabase db push` a `ptmtrbkuwszjxxdnjnwf` **solo con aprobación explícita del usuario**,
antes de probar en Expo Go. Es compatible con la app instalada (nadie lee `budgets.thresholds`). Después,
tipos regenerados contra el remoto deben coincidir con los locales.

**Fuera de 4b-2:**
- **Plan 3:** tasa diaria del BCRD (spike de la fuente primero; tasa por día y conversión por fecha en
  `spending_transactions.amount_dop`; reemplaza la tasa manual), envío de push que respeta
  `alert_thresholds`, sync que inserta y deja que el trigger categorice.
- **4c:** ceremonias, sonidos, registro del token de push, APK.
- PR `dev` → `main`: cuando el usuario lo pida.
