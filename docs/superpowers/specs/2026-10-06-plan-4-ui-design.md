# Plan 4 — UI de la app Android: dirección de diseño y Plan 4a

**Fecha:** 2026-10-06 · **Estado:** aprobado en brainstorming, pendiente de revisión del spec
**Rama:** `dev` · **Depende de:** Plan 2 (esquema, RLS y RPC aplicados al remoto)

Este spec fija la dirección visual y de interacción de toda la app (Planes 4a, 4b y 4c) y
detalla el **Plan 4a**. Los Planes 4b y 4c tendrán su propio spec corto, que hereda este.

## 1. Contexto y decisiones de partida

- La UI se construye **antes** que el backend de sync (Plan 3, pausado; sus decisiones están en
  la memoria del proyecto). Todo lo que la UI necesita para gastos manuales ya existe en
  Supabase: Auth, `transactions`, `categories`, `merchant_rules`, `budgets`, `profiles` y las
  RPC `get_spending_summary` y `get_history`.
- La UI usa **datos reales desde el inicio**. No hay pantallas con datos falsos que haya que
  rehacer. La pantalla de cuentas vinculadas muestra "próximamente" hasta el Plan 3.
- **Registro cerrado** (CLAUDE.md): no hay pantalla de registro ni correos de Auth.
- Decisiones de esta sesión de diseño:

| Tema | Decisión |
|---|---|
| Estilo | Inspirado en la UI/UX de Persona 5 (ver §2), traducido a una app de dinero (ver §3) |
| Tema | **Solo modo oscuro** |
| Ilustración | **Solo formas y tipografía** generadas en código; sin personajes ni ilustraciones |
| Sonido | **Sonidos opcionales**, originales (CC0), apagados por defecto; interruptor en Ajustes (Plan 4c) |
| Componentes | **Propios** (Reanimated + react-native-svg + NativeWind para layout). Sin librería de UI ni Lottie |
| Desarrollo | Expo Go en Android para iterar; APK con EAS Build en el Plan 4c |

## 2. Investigación: qué hace única la UI de Persona 5

- **La UI como entretenimiento.** El director de arte Masayoshi Suto se inspiró en menús de
  sitios web y trató la interfaz como "entretenimiento gráfico".
- **Paleta mínima:** rojo, negro y blanco. Un acento de contraste solo para lo seleccionado.
- **Tipografía de nota de rescate** (referencia: portadas de Sex Pistols) solo en títulos y
  énfasis; el texto de lectura va en una sans limpia.
- **Nada está derecho:** paneles inclinados, bordes dentados, recortes superpuestos en capas,
  semitonos y estrellas.
- **Movimiento rápido y con golpe:** los menús entran de golpe con leve rebote; la selección se
  transforma; el fondo cambia según el menú (el protagonista cambia de pose).
- **Momentos de ceremonia escasos:** cambio de día, pantalla de resultados, ataque final.
- **La jerarquía no se pierde:** las acciones principales siempre son las más grandes.

Fuentes: [dtnext — menús de Persona 5](https://www.dtnext.in/amp/story/edit/exuberant-video-game-menus-designed-with-da-vinci-in-mind-807823),
[Mechanics of Magic — Visual Design of Games: Persona 5](https://mechanicsofmagic.com/2022/04/23/visual-design-of-games-persona-5/),
[madegooddesigns — tipografía de Persona 5](https://madegooddesigns.com/?p=9646),
[itch.io — Making UI come to life: study of Persona 5](https://itch.io/blog/533534/making-ui-come-to-life-study-of-persona-5).

## 3. Traducción a una app de gastos

### 3.1 Reglas innegociables
1. **Los montos nunca se inclinan ni usan nota de rescate.** Siempre van rectos, con cifras de
   ancho fijo y `formatMoney()`. El estilo rodea a los números; nunca los toca.
2. **El rojo nunca se usa para texto chico** (contraste 4.3:1 sobre negro). Solo para formas y
   títulos grandes; el texto sobre bloques rojos es blanco (4.9:1).
3. **Lo cotidiano es sobrio; la ceremonia es escasa.** Solo tres momentos son ruidosos (§3.3).
4. **Pasarse del presupuesto nunca se celebra.**
5. **Inspirado en, no copiado de:** sin fuentes, logos, frases, sonidos, personajes ni assets
   del juego. Todo es original o tiene licencia libre.

### 3.2 Interacciones cotidianas
- **Pestañas:** el bloque rojo inclinado salta a la pestaña elegida (`snap`); la forma roja del
  fondo cambia de posición por pestaña (reemplaza las poses del personaje).
- **Listas:** cada movimiento es una tira inclinada (−8°). Al tocarla se desplaza levemente y
  vibra (`tap`).
- **Formularios:** se abren en un panel que entra en diagonal (`slam`), con teclado numérico
  grande para montos.
- **Títulos de pantalla:** en nota de rescate, entran con `slam` al abrir la pantalla.

### 3.3 Momentos de ceremonia (Plan 4c)
1. **Cambio de semana:** la primera vez que se abre la app en una semana nueva, el calendario
   "voltea" y muestra el cierre de la semana anterior.
2. **Aviso de presupuesto:** al 80 % y al 100 %, una `CallingCard` roja y negra.
3. **Semana bajo presupuesto:** pantalla de resultados con estrellas en blanco.

Toda ceremonia dura de 1.2 a 1.8 s y se puede saltar tocando la pantalla.

## 4. Tokens del sistema de diseño

Fuente única: `src/theme/tokens.ts`. `tailwind.config.js` importa de ahí; ningún color ni
duración se escribe dos veces.

### 4.1 Color (solo oscuro)
| Token | Hex | Uso |
|---|---|---|
| `void` | `#000000` | Fondo (negro puro; ahorra batería en OLED) |
| `panel` | `#161616` | Tiras y paneles |
| `blood` | `#E1141E` | Identidad: formas, selección, progreso, alertas |
| `paper` | `#FFFFFF` | Texto principal; tira seleccionada (blanca con texto `void`) |
| `ash` | `#9A9A9A` | Texto secundario (7:1 sobre `void`) |
| `signal` | `#FFD60A` | Solo el aviso del 80 % y el filtro "Revisar" |

No hay verde: la victoria se expresa con `paper` y estrellas.

### 4.2 Tipografía
| Rol | Fuente (Google Fonts, OFL) | Tamaños |
|---|---|---|
| Títulos y nota de rescate | Anton | 32 / 24 / 18 |
| Montos | Barlow Condensed 500, `fontVariant: ['tabular-nums']` | 52 (héroe) / 18 (filas) |
| Texto | Barlow 400 / 500 | 15 / 13 |

`RansomText` deriva el estilo de cada letra de una semilla fija (el propio texto): el mismo
título siempre se ve igual.

### 4.3 Geometría
- Ángulos fijos: tiras −8°, formas de fondo −14°, títulos −4°.
- Radio de borde 0 en todo; los cortes dentados son polígonos SVG.

### 4.4 Movimiento (`src/theme/motion.ts`)
| Token | Valor | Uso |
|---|---|---|
| `snap` | spring `{ damping: 18, stiffness: 380, mass: 0.6 }` | Selección, cambio de pestaña |
| `slam` | entrada diagonal desde fuera + spring `{ damping: 14, stiffness: 260 }` | Paneles, tarjetas, títulos |
| `tap` | 90 ms + vibración leve (`expo-haptics`, `ImpactFeedbackStyle.Light`) | Respuesta al tocar |
| `screen` | 220 ms | Transición entre pantallas |
| `stagger` | 35 ms entre filas, máximo 8 filas | Entrada de listas al abrir (nunca al hacer scroll) |
| `ceremony` | 1.2–1.8 s, saltable | Ceremonias (4c) |

**Reducir animaciones:** si Android tiene activada la opción, todo token se reduce a un
fundido de 120 ms, sin traslación, rotación ni rebote (`useReducedMotion` de Reanimated,
envuelto en `useMotionPreference`).

## 5. División del Plan 4

| Plan | Contenido | Termina con |
|---|---|---|
| **4a** (este spec) | Expo en el repo, Expo Router, NativeWind, cliente Supabase con sesión cifrada, fuentes, tokens, componentes base, galería de desarrollo, login real | La app abre en el celular, el usuario inicia sesión y recorre la galería |
| **4b** | Inicio, transacciones (lista paginada, filtros, editar, ignorar, alta manual, filtro "Revisar"), historial, presupuesto, categorías y reglas, ajustes (cambiar contraseña con `updateUser`, tasa USD), cuentas vinculadas en "próximamente" | La app sirve para registrar y ver gastos manuales |
| **4c** | Las tres ceremonias, sonidos opcionales (`expo-audio`, CC0, apagados por defecto), registro del token de push (`expo-notifications`) y APK con EAS Build | App instalable; el Plan 3 la llena de datos automáticos |

## 6. Plan 4a en detalle

### 6.1 Componentes base (`src/components/`, uno por archivo)
| Componente | Responsabilidad |
|---|---|
| `SlantPanel` | Fondo de polígono inclinado o dentado (SVG); el contenido queda derecho |
| `RansomText` | Título en nota de rescate con semilla fija; `accessibilityLabel` = texto completo, letras ocultas al lector |
| `Amount` | Monto con `formatMoney()` y cifras de ancho fijo; nunca inclinado |
| `SkewButton` | Botón inclinado; al tocarlo se hunde (`tap`) y vibra |
| `SkewRow` | Tira de lista; variante seleccionada (`paper` con texto `void`) |
| `JaggedProgress` | Barra dentada: `blood`; borde `signal` desde el 80 %; desde el 100 %, el extremo se "rompe" |
| `SlamTabBar` | Barra de pestañas propia para Expo Router; bloque rojo con `snap`; forma de fondo por pestaña |
| `SlamSheet` | Panel que entra en diagonal (`slam`) para formularios |
| `CallingCard` | Tarjeta de anuncio grande (avisos y ceremonias del 4c) |

La lógica pura de los componentes vive fuera de ellos para poder testearla: la semilla y la
generación de estilos de `RansomText` (`src/theme/ransom.ts`) y la geometría de los polígonos
(`src/theme/shapes.ts`).

### 6.2 Fundación
- **`src/lib/env.ts`:** schema zod de `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Es el único archivo que lee `process.env`.
- **`src/lib/supabase.ts`:** cliente con la anon key. La sesión se guarda cifrada con el patrón
  recomendado por Supabase para Expo: clave AES en `expo-secure-store` (límite de ~2 KB por
  valor) y sesión cifrada en `@react-native-async-storage/async-storage`.
- **`src/lib/queryClient.ts`:** TanStack Query.
- **`src/lib/money.ts`:** `formatMoney(amount, currency)` → `RD$ 1,234.56` / `US$ 12.00`.
- **`src/lib/dates.ts`:** límites de semana (lunes) y mes en `America/Santo_Domingo`, para
  etiquetas de la UI. Los totales siguen viniendo de las RPC (CLAUDE.md).
- **`src/types/database.ts`:** re-exporta `supabase/functions/_shared/database.types.ts`.
- **Dependencias:** se instalan con `bunx expo install` para fijar versiones compatibles con el
  SDK (Expo Router, Reanimated, react-native-svg, NativeWind, expo-font, expo-haptics,
  expo-secure-store, AsyncStorage, TanStack Query, supabase-js, zod).
- **Calidad:** `bun run check` suma el typecheck de la app y `bunx expo lint`. `tsc` pasa a
  cubrir `app` y `src`, además de lo que ya cubre (`scripts`, `tests` y
  `supabase/functions/_shared/parsers`); el resto de `supabase/functions` sigue solo en Deno
  (test y lint).

### 6.3 Rutas
```
app/_layout.tsx          providers (QueryClient, fuentes), redirección según sesión
app/(auth)/login.tsx     email + contraseña; sin registro
app/(tabs)/_layout.tsx   SlamTabBar con 5 pestañas
app/(tabs)/index.tsx     inicio            ┐
app/(tabs)/transactions.tsx                │ en el 4a: solo el título con RansomText
app/(tabs)/history.tsx                     │ y un botón para cerrar sesión en ajustes
app/(tabs)/budget.tsx                      │
app/(tabs)/settings.tsx                    ┘
app/dev/gallery.tsx      galería de componentes; solo existe si __DEV__
```
`app/` solo enruta y compone; la lógica vive en `src/features/auth/` (sesión, login, logout).

### 6.4 Login
- Campos de correo y contraseña; `signInWithPassword`.
- Errores en español, específicos: "Correo o contraseña incorrectos", "Sin conexión. Revisa tu
  internet e intenta de nuevo".
- Texto bajo el botón: "Si olvidaste tu contraseña, pídele al administrador que la restablezca".
- Sin enlaces de registro ni de recuperación por correo.

### 6.5 Pruebas
- **Vitest** (`tests/unit/`): `money.ts` (formatos DOP/USD, negativos, redondeo a 2
  decimales), `dates.ts` (inicio de semana en lunes, cruce de mes y año en hora dominicana),
  `ransom.ts` (mismo texto → mismo estilo; ninguna letra ilegible), `shapes.ts` (polígonos
  dentro de los límites) y el schema de `env.ts`.
- **Componentes:** sin tests automáticos (CLAUDE.md). Se verifican en la galería, en el
  celular, con una checklist por componente: aspecto, respuesta al tocar y comportamiento con
  "reducir animaciones" activado.

### 6.6 Accesibilidad y rendimiento
- Áreas táctiles ≥ 48 dp; etiquetas de accesibilidad en botones de solo ícono y en `RansomText`;
  `Amount` expone el monto completo al lector de pantalla.
- Todas las animaciones en el hilo de UI (Reanimated); sin blur ni sombras; listas sin
  animación durante el scroll. Objetivo: 60 fps en un Android de gama media.

### 6.7 Riesgos
| Riesgo | Mitigación |
|---|---|
| Expo y Deno en el mismo repo: `tsconfig` y lint chocan | Alcances separados: `tsc` para app, src, scripts, tests y parsers; Deno para `supabase/functions` |
| Metro debe importar tipos desde `supabase/functions/_shared` | Alias de ruta verificado en la primera tarea del plan |
| Versión de una librería incompatible con Expo Go | Todo se instala con `bunx expo install` |
| El estilo cansa con el uso diario | Lo cotidiano es sobrio; solo tres ceremonias ruidosas |
| `tabular-nums` no soportado por la fuente en Android | Verificar en la galería; si falla, ancho fijo por dígito en `Amount` |

### 6.8 Fuera del 4a
Pantallas con datos (4b); ceremonias, sonidos, push y APK (4c); vincular cuentas y
sincronización (Plan 3).
