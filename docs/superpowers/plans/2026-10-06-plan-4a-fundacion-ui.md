# Plan 4a — Fundación de la app y sistema de diseño — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar la app Expo al repo con su sistema de diseño inspirado en Persona 5 (tokens, movimiento, 10 componentes base, galería de desarrollo) y un login real contra Supabase, de modo que el usuario abra la app en su Android con Expo Go, inicie sesión y recorra la galería.

**Architecture:** Expo managed + Expo Router en la raíz del repo existente (mismo `package.json`). Los tokens viven en `src/theme/` (colores en un JSON que comparten TypeScript y Tailwind). Toda la lógica pura (montos, fechas, nota de rescate, geometría, progreso, errores de auth, env) vive en módulos sin React Native y nace con tests de Vitest; los componentes en `src/components/` solo componen esa lógica con Reanimated y react-native-svg. `app/` solo enruta.

**Tech Stack:** Bun, Expo (SDK vigente) + Expo Router, React Native, TypeScript strict, NativeWind 4.2.x + Tailwind 3.4, react-native-reanimated (+ react-native-worklets si el SDK trae Reanimated 4), react-native-svg, expo-haptics, expo-font + `@expo-google-fonts/*`, expo-secure-store + AsyncStorage + aes-js, `@supabase/supabase-js`, TanStack Query, zod 4, Vitest, ESLint (`eslint-config-expo`).

**Spec:** `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md` (secciones 3, 4 y 6). Leerlo antes de cada tarea que toque UI.

## Global Constraints

- **Rama `dev`.** Nunca commitear en `main`. Cada commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (segundo `-m`).
- **Bun siempre.** `bun add`, `bun add -d`, `bunx expo install`. **Nunca** npm, yarn ni npx. Las dependencias del ecosistema Expo se instalan con `bunx expo install` (fija versiones compatibles con el SDK).
- **Solo Android.** No agregar config ni código específico de iOS ni de web.
- **Solo modo oscuro.** `userInterfaceStyle: "dark"`; fondo `#000000`.
- **Colores solo desde tokens.** Ningún color literal (hex ni `rgba`) fuera de `src/theme/colors.json`. Paleta exacta: `void #000000`, `panel #161616`, `blood #E1141E`, `paper #FFFFFF`, `ash #9A9A9A`, `signal #FFD60A`, más `scrim rgba(0, 0, 0, 0.75)` (velo de modales).
- **Los montos nunca se inclinan ni usan nota de rescate:** siempre `Amount` / `formatMoney()`, cifras de ancho fijo.
- **El rojo (`blood`) nunca se usa para texto de menos de 18 px.** Texto sobre `blood` siempre `paper`.
- **Radio de borde 0** en todo. Ángulos fijos: tiras `-8`, fondos `-14`, títulos `-4` (grados).
- **Movimiento:** `snap` = spring `{ damping: 18, stiffness: 380, mass: 0.6 }`; `slam` = spring `{ damping: 14, stiffness: 260, mass: 1 }`; `tap` 90 ms; `screen` 220 ms; `stagger` 35 ms con máximo 8 filas; con "reducir animaciones" todo es un fundido de 120 ms sin traslación, rotación ni rebote.
- **Tipografía:** Anton (títulos/nota de rescate, 32/24/18), Barlow Condensed 500 con `tabular-nums` (montos, 52/18), Barlow 400/500 (texto, 15/13).
- **Textos de UI en español**, sentence case salvo los títulos en nota de rescate (mayúsculas por diseño). Sin `console.log`. Un componente por archivo. Componentes funcionales con hooks.
- **`process.env` solo en `src/lib/env.ts`.**
- **Sin tests de componentes ni pantallas** (no instalar `@testing-library/react-native`). La lógica pura sí nace con test de Vitest (TDD: test primero, verlo fallar, implementar).
- **Inspirado en, no copiado de, Persona 5:** sin fuentes, logos, frases, sonidos, personajes ni assets del juego.
- **Antes de commitear cada tarea:** `bun run check` en verde (typecheck + test + test:deno + lint). Las tareas que tocan la app además corren el export de verificación (Task 1, Step 9).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `package.json` (mod.) | `main: expo-router/entry`; sin `"type": "module"`; scripts `start`, `lint` (Deno + ESLint), `verify:bundle` |
| `app.json` | Config Expo: nombre, scheme, Android, dark, plugins |
| `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts` | Toolchain NativeWind |
| `eslint.config.js` | ESLint de Expo, ignora `supabase/**` |
| `tsconfig.json` (mod.) | Extiende `expo/tsconfig.base`; alias `@/*` → `src/*` |
| `vitest.config.ts` (mod.) | Alias `@` para los tests |
| `.env.example` | Nombres de las variables `EXPO_PUBLIC_*` (sin valores) |
| `src/theme/colors.json` | Paleta (fuente única, la lee Tailwind) |
| `src/theme/tokens.ts` | Colores tipados, fuentes, escala tipográfica, ángulos, tamaño táctil |
| `src/theme/motion-tokens.ts` | Springs, duraciones, `staggerDelay` (puro) |
| `src/theme/motion.ts` | Hooks/animaciones Reanimated: `useMotionPreference`, `animateTo`, `slamIn`, `fadeInReduced` |
| `src/theme/ransom.ts` | Estilo por letra de la nota de rescate con semilla fija (puro) |
| `src/theme/shapes.ts` | Polígonos inclinados y dentados (puro) |
| `src/theme/progress.ts` | Estado de la barra de presupuesto (puro) |
| `src/theme/backdrops.ts` | Posición de la forma de fondo por pestaña (datos) |
| `src/lib/money.ts` | `formatMoney`, `moneyAccessibilityLabel` |
| `src/lib/dates.ts` | Fecha local por zona, inicio de semana (lunes), etiqueta de día |
| `src/lib/env-schema.ts` | `parseEnv` (puro, zod) |
| `src/lib/env.ts` | Único lector de `process.env` |
| `src/lib/supabase.ts` | Cliente con sesión cifrada + auto-refresh por AppState |
| `src/lib/queryClient.ts` | Instancia de TanStack Query |
| `src/lib/haptics.ts` | `tapFeedback()` |
| `src/types/database.ts` | Re-exporta los tipos generados del Plan 2 |
| `src/components/*.tsx` | `Amount`, `RansomText`, `SlantPanel`, `SkewButton`, `SkewRow`, `TextField`, `JaggedProgress`, `SlamSheet`, `CallingCard`, `SlamTabBar`, `Screen` |
| `src/features/auth/errors.ts` | `authErrorMessage` (puro) |
| `src/features/auth/api.ts`, `hooks.ts` | `signIn`, `signOut`, `useSession` |
| `src/features/auth/components/LoginForm.tsx`, `SignOutButton.tsx` | UI de auth |
| `app/_layout.tsx` | Providers, fuentes, rutas protegidas por sesión |
| `app/(auth)/login.tsx` | Pantalla de login |
| `app/(tabs)/_layout.tsx` + 5 pantallas | Pestañas con `SlamTabBar` |
| `app/dev/gallery.tsx` | Galería de componentes (solo `__DEV__`) |
| `tests/unit/src/**` | Tests de Vitest de los módulos puros |

---

### Task 1: Expo, Expo Router y NativeWind en el repo

**Files:**
- Modify: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, `eslint.config.js`, `.env.example`, `src/theme/colors.json`, `src/types/database.ts`, `app/_layout.tsx`, `app/index.tsx`

**Interfaces:**
- Produces: alias `@/*` → `src/*` en TypeScript, Metro y Vitest; `src/theme/colors.json`; `src/types/database.ts` con `Database`, `Tables`, `Enums`, `Currency`; script `bun run verify:bundle`; `bun run lint` = Deno + ESLint.

- [ ] **Step 1: Quitar `"type": "module"` y declarar la entrada de Expo**

En `package.json`: eliminar la línea `"type": "module",` y agregar `"main": "expo-router/entry",` después de `"private": true,`. Motivo: Metro, Babel, Tailwind y ESLint cargan sus configs con `require()`; con `"type": "module"` Node los trataría como ESM. Los scripts actuales son `.ts` ejecutados por Bun y no dependen de ese campo.

- [ ] **Step 2: Instalar dependencias**

Run (en este orden):
```bash
bun add expo
bunx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-splash-screen react react-native
bunx expo install react-native-reanimated react-native-worklets react-native-svg expo-haptics expo-font expo-secure-store @react-native-async-storage/async-storage
bunx expo install @expo-google-fonts/anton @expo-google-fonts/barlow @expo-google-fonts/barlow-condensed @expo/vector-icons
bun add nativewind@^4.2.7 @supabase/supabase-js @tanstack/react-query zod@^4 aes-js react-native-get-random-values react-native-url-polyfill
bun add -d tailwindcss@^3.4.17 @types/aes-js @types/react
bunx expo install eslint eslint-config-expo -- -d
```
Si `react-native-worklets` no es instalable para el SDK resultante (SDK con Reanimated 3), quitarlo y anotarlo en el reporte: NativeWind 4.2.7 soporta Reanimated 3 y 4, y con Reanimated 3 **no** se agrega Worklets.
Expected: `bun.lock` actualizado; ningún `package-lock.json` ni `yarn.lock` creado.

- [ ] **Step 3: Config de Expo**

`app.json`:
```json
{
  "expo": {
    "name": "Recibo",
    "slug": "recibo",
    "scheme": "recibo",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "backgroundColor": "#000000",
    "platforms": ["android"],
    "android": {
      "package": "com.oct4vius.recibo",
      "edgeToEdgeEnabled": true
    },
    "plugins": ["expo-router", "expo-secure-store"]
  }
}
```

`babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
```

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

`global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`nativewind-env.d.ts`:
```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 4: Paleta compartida y Tailwind**

`src/theme/colors.json`:
```json
{
  "void": "#000000",
  "panel": "#161616",
  "blood": "#E1141E",
  "paper": "#FFFFFF",
  "ash": "#9A9A9A",
  "signal": "#FFD60A",
  "scrim": "rgba(0, 0, 0, 0.75)"
}
```

`tailwind.config.js`:
```js
const colors = require('./src/theme/colors.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: { colors },
    borderRadius: { none: '0' },
  },
  plugins: [],
};
```

- [ ] **Step 5: TypeScript y Vitest**

`tsconfig.json` (reemplazar completo):
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "app",
    "src",
    "scripts",
    "tests",
    "supabase/functions/_shared/parsers",
    "nativewind-env.d.ts",
    "expo-env.d.ts",
    ".expo/types/**/*.ts"
  ],
  "exclude": ["node_modules", "**/*.test.ts", "**/test-helpers.ts"]
}
```
Nota: se quitó `"types": ["node"]` para que TypeScript incluya los tipos de React Native y de Node automáticamente. Si `scripts/` deja de compilar por falta de tipos de Node, volver a agregar `"types": ["node"]` y verificar que `app/` siga compilando; reportar cuál quedó.

`vitest.config.ts` (reemplazar completo):
```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Tipos de la base de datos**

`src/types/database.ts`:
```ts
// Única fuente: los tipos generados por `bun run db:types` (Plan 2). No escribir tipos de tablas a mano.
export type { Database, Enums, Tables, TablesInsert, TablesUpdate } from '../../supabase/functions/_shared/database.types.ts';

import type { Enums } from '../../supabase/functions/_shared/database.types.ts';

export type Currency = Enums<'currency_code'>;
```

- [ ] **Step 7: ESLint, scripts, env y gitignore**

`eslint.config.js`:
```js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['supabase/**', 'dist/**', '.expo/**', 'node_modules/**'] },
]);
```

En `package.json` → `scripts`: reemplazar `"lint"` y agregar `start` y `verify:bundle`:
```json
"start": "expo start",
"lint": "deno lint supabase/functions/ && expo lint",
"verify:bundle": "expo export --platform android --output-dir .expo-export-check && node -e \"require('fs').rmSync('.expo-export-check',{recursive:true,force:true})\"",
```

`.env.example`:
```bash
# Copiar a .env.local con los valores reales. Ambos son públicos (viajan dentro del APK).
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Agregar al final de `.gitignore`:
```
# expo
expo-env.d.ts
.expo-export-check/
/android
/ios
```

- [ ] **Step 8: Pantalla mínima para comprobar la cadena**

`app/_layout.tsx`:
```tsx
import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/index.tsx` (temporal; la Task 9 la elimina):
```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-void">
      <Text className="text-paper text-xl">Recibo</Text>
    </View>
  );
}
```

- [ ] **Step 9: Verificar que todo compila y empaqueta**

Run: `bun run typecheck`
Expected: sin errores.
Run: `bun run lint`
Expected: Deno lint OK y ESLint sin errores.
Run: `bun run test && bun run test:deno`
Expected: los mismos tests de antes en verde (Vitest 4 tests con los `.eml` locales o 2 + 2 skipped; Deno 53).
Run: `bun run verify:bundle`
Expected: `Exported: .expo-export-check` (o mensaje equivalente) sin errores de Babel/Metro/NativeWind, y la carpeta borrada al final. Esto prueba que el bundle de Android se arma sin necesitar un dispositivo.

- [ ] **Step 10: Commit**

```bash
git add package.json bun.lock app.json babel.config.js metro.config.js tailwind.config.js global.css nativewind-env.d.ts eslint.config.js tsconfig.json vitest.config.ts .gitignore .env.example src/theme/colors.json src/types/database.ts app/_layout.tsx app/index.tsx
git commit -m "chore(app): add expo, expo router and nativewind to the repo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Montos y fechas (`money.ts`, `dates.ts`)

**Files:**
- Create: `src/lib/money.ts`, `src/lib/dates.ts`
- Test: `tests/unit/src/lib/money.test.ts`, `tests/unit/src/lib/dates.test.ts`

**Interfaces:**
- Consumes: `Currency` de `@/types/database`.
- Produces:
  - `formatMoney(amount: number, currency: Currency): string` → `'RD$ 1,234.56'`, `'US$ 12.00'`, `'-RD$ 50.00'`
  - `moneyAccessibilityLabel(amount: number, currency: Currency): string` → `'1,234.56 pesos'`, `'12.00 dólares'`, `'menos 50.00 pesos'`
  - `interface LocalDate { year: number; month: number; day: number; weekday: number }` (`weekday` 1 = lunes … 7 = domingo)
  - `toLocalDate(instant: Date, timeZone: string): LocalDate`
  - `weekStart(date: LocalDate): LocalDate`
  - `formatDayLabel(date: LocalDate): string` → `'MAR 06 / OCT'`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/src/lib/money.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatMoney, moneyAccessibilityLabel } from '@/lib/money';

describe('formatMoney', () => {
  it('formats DOP with the RD$ prefix, thousands separator and 2 decimals', () => {
    expect(formatMoney(1234.56, 'DOP')).toBe('RD$ 1,234.56');
  });
  it('formats USD with the US$ prefix', () => {
    expect(formatMoney(12, 'USD')).toBe('US$ 12.00');
  });
  it('always shows two decimals', () => {
    expect(formatMoney(275.7, 'DOP')).toBe('RD$ 275.70');
    expect(formatMoney(0, 'DOP')).toBe('RD$ 0.00');
  });
  it('rounds to two decimals', () => {
    expect(formatMoney(10.126, 'DOP')).toBe('RD$ 10.13');
  });
  it('puts the minus sign before the currency', () => {
    expect(formatMoney(-50, 'DOP')).toBe('-RD$ 50.00');
  });
  it('handles millions', () => {
    expect(formatMoney(1234567.8, 'USD')).toBe('US$ 1,234,567.80');
  });
});

describe('moneyAccessibilityLabel', () => {
  it('reads pesos and dólares instead of symbols', () => {
    expect(moneyAccessibilityLabel(1234.56, 'DOP')).toBe('1,234.56 pesos');
    expect(moneyAccessibilityLabel(12, 'USD')).toBe('12.00 dólares');
  });
  it('reads negatives with "menos"', () => {
    expect(moneyAccessibilityLabel(-50, 'DOP')).toBe('menos 50.00 pesos');
  });
});
```

`tests/unit/src/lib/dates.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatDayLabel, toLocalDate, weekStart, type LocalDate } from '@/lib/dates';

const SD = 'America/Santo_Domingo';
const d = (year: number, month: number, day: number, weekday: number): LocalDate => ({ year, month, day, weekday });

describe('toLocalDate', () => {
  it('converts an instant to the calendar date in the given time zone', () => {
    // 2026-10-06T02:30Z = lunes 5 de octubre, 22:30 en Santo Domingo (UTC-4)
    expect(toLocalDate(new Date('2026-10-06T02:30:00Z'), SD)).toEqual(d(2026, 10, 5, 1));
  });
  it('keeps the same date when UTC and local agree', () => {
    expect(toLocalDate(new Date('2026-10-06T15:00:00Z'), SD)).toEqual(d(2026, 10, 6, 2));
  });
  it('reports Sunday as weekday 7', () => {
    expect(toLocalDate(new Date('2026-10-11T12:00:00Z'), SD).weekday).toBe(7);
  });
});

describe('weekStart', () => {
  it('keeps a Monday as is', () => {
    expect(weekStart(d(2026, 10, 5, 1))).toEqual(d(2026, 10, 5, 1));
  });
  it('moves a Sunday back to the previous Monday', () => {
    expect(weekStart(d(2026, 10, 11, 7))).toEqual(d(2026, 10, 5, 1));
  });
  it('crosses a month boundary', () => {
    // jueves 1 de octubre de 2026 → lunes 28 de septiembre
    expect(weekStart(d(2026, 10, 1, 4))).toEqual(d(2026, 9, 28, 1));
  });
  it('crosses a year boundary', () => {
    // viernes 1 de enero de 2027 → lunes 28 de diciembre de 2026
    expect(weekStart(d(2027, 1, 1, 5))).toEqual(d(2026, 12, 28, 1));
  });
});

describe('formatDayLabel', () => {
  it('uses Spanish abbreviations and two-digit days', () => {
    expect(formatDayLabel(d(2026, 10, 6, 2))).toBe('MAR 06 / OCT');
    expect(formatDayLabel(d(2026, 1, 11, 7))).toBe('DOM 11 / ENE');
  });
});
```

- [ ] **Step 2: Verlos fallar**

Run: `bun run test`
Expected: FAIL — `Failed to resolve import "@/lib/money"` y `"@/lib/dates"`.

- [ ] **Step 3: Implementar**

`src/lib/money.ts`:
```ts
import type { Currency } from '@/types/database';

const SYMBOL: Record<Currency, string> = { DOP: 'RD$', USD: 'US$' };
const SPOKEN: Record<Currency, string> = { DOP: 'pesos', USD: 'dólares' };

const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function digits(amount: number): string {
  return number.format(Math.abs(amount));
}

/** Formato de montos de toda la app: `RD$ 1,234.56`, `US$ 12.00`, `-RD$ 50.00`. */
export function formatMoney(amount: number, currency: Currency): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${SYMBOL[currency]} ${digits(amount)}`;
}

/** Texto para lectores de pantalla: `1,234.56 pesos`, `menos 50.00 pesos`. */
export function moneyAccessibilityLabel(amount: number, currency: Currency): string {
  const sign = amount < 0 ? 'menos ' : '';
  return `${sign}${digits(amount)} ${SPOKEN[currency]}`;
}
```

`src/lib/dates.ts`:
```ts
/** Fecha de calendario en una zona horaria. `weekday`: 1 = lunes … 7 = domingo. */
export interface LocalDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const WEEKDAY_ES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const MONTH_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DAY_MS = 86_400_000;

export function toLocalDate(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: WEEKDAY_INDEX[get('weekday')],
  };
}

/** Lunes de la semana de `date` (la semana empieza en lunes). Aritmética de calendario pura, sin zona. */
export function weekStart(date: LocalDate): LocalDate {
  const utc = Date.UTC(date.year, date.month - 1, date.day) - (date.weekday - 1) * DAY_MS;
  const monday = new Date(utc);
  return { year: monday.getUTCFullYear(), month: monday.getUTCMonth() + 1, day: monday.getUTCDate(), weekday: 1 };
}

/** `MAR 06 / OCT`: etiqueta corta de día para la UI. */
export function formatDayLabel(date: LocalDate): string {
  const day = String(date.day).padStart(2, '0');
  return `${WEEKDAY_ES[date.weekday - 1]} ${day} / ${MONTH_ES[date.month - 1]}`;
}
```

- [ ] **Step 4: Verlos pasar**

Run: `bun run test`
Expected: PASS — money (8 asserts en 6+2 casos) y dates (8 casos) en verde, más los tests previos.

- [ ] **Step 5: Check y commit**

Run: `bun run check`
Expected: verde.
```bash
git add src/lib/money.ts src/lib/dates.ts tests/unit/src/lib/money.test.ts tests/unit/src/lib/dates.test.ts
git commit -m "feat(app): add money formatting and local date helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tokens, movimiento, nota de rescate, formas y progreso

**Files:**
- Create: `src/theme/tokens.ts`, `src/theme/motion-tokens.ts`, `src/theme/motion.ts`, `src/theme/ransom.ts`, `src/theme/shapes.ts`, `src/theme/progress.ts`, `src/theme/backdrops.ts`, `src/lib/haptics.ts`
- Test: `tests/unit/src/theme/ransom.test.ts`, `tests/unit/src/theme/shapes.test.ts`, `tests/unit/src/theme/progress.test.ts`, `tests/unit/src/theme/motion-tokens.test.ts`

**Interfaces:**
- Consumes: `src/theme/colors.json` (Task 1).
- Produces:
  - `colors: Record<ColorToken, string>`, `type ColorToken = 'void' | 'panel' | 'blood' | 'paper' | 'ash' | 'signal' | 'scrim'`
  - `fonts = { display: 'Anton_400Regular', amount: 'BarlowCondensed_500Medium', body: 'Barlow_400Regular', bodyStrong: 'Barlow_500Medium' }`
  - `typeScale = { displayLg: 32, displayMd: 24, displaySm: 18, amountHero: 52, amountRow: 18, body: 15, caption: 13 }`
  - `angles = { row: -8, backdrop: -14, title: -4 }`, `MIN_TOUCH = 48`
  - `springs.snap`, `springs.slam`, `durations = { tap: 90, screen: 220, reducedFade: 120, staggerStep: 35 }`, `STAGGER_MAX_ROWS = 8`, `staggerDelay(index: number): number`
  - `useMotionPreference(): { reduced: boolean }`, `animateTo(target: number, kind: 'snap' | 'slam', reduced: boolean)` (worklet), `slamIn` (entering animation), `fadeInReduced` (entering animation), `enteringFor(reduced: boolean)`
  - `ransomLetters(text: string): RansomGlyph[]` con `RansomGlyph = { kind: 'space' } | { kind: 'letter'; char: string; background: ColorToken; color: ColorToken; bordered: boolean; rotate: number }`
  - `type Point = readonly [number, number]`, `slantedRect(width, height, skewDeg): Point[]`, `jaggedRect(width, height, teeth, depth): Point[]`, `toSvgPoints(points): string`
  - `progressState(spent: number, limit: number): { fill: number; percent: number; tone: 'normal' | 'warning' | 'over' }`
  - `BACKDROPS: readonly Backdrop[]` (5 entradas), `Backdrop = { top: number; right: number; width: number; height: number; rotate: number }`
  - `tapFeedback(): void`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/src/theme/ransom.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ransomLetters } from '@/theme/ransom';

describe('ransomLetters', () => {
  it('is deterministic: the same text always gets the same styles', () => {
    expect(ransomLetters('ESTA SEMANA')).toEqual(ransomLetters('ESTA SEMANA'));
  });
  it('produces one glyph per character, including accented ones', () => {
    expect(ransomLetters('ÚLTIMOS')).toHaveLength(7);
  });
  it('turns spaces into space glyphs', () => {
    const glyphs = ransomLetters('A B');
    expect(glyphs[1]).toEqual({ kind: 'space' });
  });
  it('never paints a letter with the same color as its background', () => {
    for (const g of ransomLetters('PRESUPUESTO DE LA SEMANA')) {
      if (g.kind === 'letter') expect(g.color).not.toBe(g.background);
    }
  });
  it('never repeats the same look on two consecutive letters', () => {
    const letters = ransomLetters('MOVIMIENTOS').filter((g) => g.kind === 'letter');
    for (let i = 1; i < letters.length; i++) {
      const a = letters[i - 1];
      const b = letters[i];
      if (a.kind === 'letter' && b.kind === 'letter') {
        expect([a.background, a.color, a.bordered]).not.toEqual([b.background, b.color, b.bordered]);
      }
    }
  });
  it('keeps rotations within ±6 degrees', () => {
    for (const g of ransomLetters('HISTORIAL')) {
      if (g.kind === 'letter') expect(Math.abs(g.rotate)).toBeLessThanOrEqual(6);
    }
  });
  it('gives different texts different looks', () => {
    expect(ransomLetters('INICIO')).not.toEqual(ransomLetters('AJUSTE'));
  });
});
```

`tests/unit/src/theme/shapes.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { jaggedRect, slantedRect, toSvgPoints } from '@/theme/shapes';

const inside = (w: number, h: number) => ([x, y]: readonly [number, number]) =>
  x >= 0 && x <= w && y >= 0 && y <= h;

describe('slantedRect', () => {
  it('returns a 4-point parallelogram inside the box', () => {
    const pts = slantedRect(200, 40, -8);
    expect(pts).toHaveLength(4);
    expect(pts.every(inside(200, 40))).toBe(true);
  });
  it('is a plain rectangle when the skew is 0', () => {
    expect(slantedRect(100, 20, 0)).toEqual([[0, 0], [100, 0], [100, 20], [0, 20]]);
  });
  it('clamps the slant offset to half the width on extreme angles', () => {
    const pts = slantedRect(10, 100, -60);
    expect(pts.every(inside(10, 100))).toBe(true);
  });
});

describe('jaggedRect', () => {
  it('keeps every point inside the box', () => {
    expect(jaggedRect(300, 30, 12, 6).every(inside(300, 30))).toBe(true);
  });
  it('has 2 top corners plus 2 points per tooth on the bottom edge plus 1 closing point', () => {
    expect(jaggedRect(300, 30, 12, 6)).toHaveLength(2 + 12 * 2 + 1);
  });
});

describe('toSvgPoints', () => {
  it('serializes points with one decimal', () => {
    expect(toSvgPoints([[0, 0], [10.25, 5]])).toBe('0.0,0.0 10.3,5.0');
  });
});
```

`tests/unit/src/theme/progress.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { progressState } from '@/theme/progress';

describe('progressState', () => {
  it('is normal below 80%', () => {
    expect(progressState(3000, 6000)).toEqual({ fill: 0.5, percent: 50, tone: 'normal' });
  });
  it('floors the percent so 79.98% is not shown as 80%', () => {
    expect(progressState(4799, 6000)).toEqual({ fill: 4799 / 6000, percent: 79, tone: 'normal' });
  });
  it('warns from exactly 80%', () => {
    expect(progressState(4800, 6000).tone).toBe('warning');
  });
  it('is over from exactly 100% and clamps the fill to 1', () => {
    expect(progressState(6000, 6000)).toEqual({ fill: 1, percent: 100, tone: 'over' });
    expect(progressState(9000, 6000)).toEqual({ fill: 1, percent: 150, tone: 'over' });
  });
  it('treats negative spending as zero', () => {
    expect(progressState(-10, 6000)).toEqual({ fill: 0, percent: 0, tone: 'normal' });
  });
  it('rejects a non-positive limit', () => {
    expect(() => progressState(10, 0)).toThrow('limit must be greater than 0');
  });
});
```

`tests/unit/src/theme/motion-tokens.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { STAGGER_MAX_ROWS, durations, springs, staggerDelay } from '@/theme/motion-tokens';

describe('motion tokens', () => {
  it('matches the spec values', () => {
    expect(springs.snap).toEqual({ damping: 18, stiffness: 380, mass: 0.6 });
    expect(springs.slam).toEqual({ damping: 14, stiffness: 260, mass: 1 });
    expect(durations).toEqual({ tap: 90, screen: 220, reducedFade: 120, staggerStep: 35 });
  });
  it('staggers rows by 35 ms and stops growing after 8 rows', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(105);
    expect(staggerDelay(STAGGER_MAX_ROWS - 1)).toBe(245);
    expect(staggerDelay(40)).toBe(245);
  });
});
```

- [ ] **Step 2: Verlos fallar**

Run: `bun run test`
Expected: FAIL — no se resuelven `@/theme/ransom`, `@/theme/shapes`, `@/theme/progress`, `@/theme/motion-tokens`.

- [ ] **Step 3: Implementar los módulos puros**

`src/theme/tokens.ts`:
```ts
import palette from './colors.json';

/** `scrim` es el velo detrás de paneles modales; no se usa para texto ni superficies. */
export type ColorToken = 'void' | 'panel' | 'blood' | 'paper' | 'ash' | 'signal' | 'scrim';

/** Paleta de la app (solo modo oscuro). Fuente: `colors.json`, que también lee Tailwind. */
export const colors: Record<ColorToken, string> = palette;

export const fonts = {
  display: 'Anton_400Regular',
  amount: 'BarlowCondensed_500Medium',
  body: 'Barlow_400Regular',
  bodyStrong: 'Barlow_500Medium',
} as const;

export const typeScale = {
  displayLg: 32,
  displayMd: 24,
  displaySm: 18,
  amountHero: 52,
  amountRow: 18,
  body: 15,
  caption: 13,
} as const;

/** Ángulos fijos en grados: pocos ángulos para que lo inclinado se lea como sistema. */
export const angles = { row: -8, backdrop: -14, title: -4 } as const;

/** Área táctil mínima en dp. */
export const MIN_TOUCH = 48;
```

`src/theme/motion-tokens.ts`:
```ts
export const springs = {
  snap: { damping: 18, stiffness: 380, mass: 0.6 },
  slam: { damping: 14, stiffness: 260, mass: 1 },
} as const;

export const durations = { tap: 90, screen: 220, reducedFade: 120, staggerStep: 35 } as const;

export const STAGGER_MAX_ROWS = 8;

/** Retraso de entrada de la fila `index`; deja de crecer después de 8 filas. */
export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ROWS - 1) * durations.staggerStep;
}
```

`src/theme/ransom.ts`:
```ts
import type { ColorToken } from './tokens';

export type RansomGlyph =
  | { kind: 'space' }
  | { kind: 'letter'; char: string; background: ColorToken; color: ColorToken; bordered: boolean; rotate: number };

interface Look {
  background: ColorToken;
  color: ColorToken;
  bordered: boolean;
}

const LOOKS: readonly Look[] = [
  { background: 'paper', color: 'void', bordered: false },
  { background: 'void', color: 'paper', bordered: true },
  { background: 'paper', color: 'blood', bordered: false },
  { background: 'void', color: 'paper', bordered: false },
  { background: 'blood', color: 'paper', bordered: false },
];

const ROTATIONS = [-6, -3, 0, 0, 3, 6] as const;

/** FNV-1a de 32 bits: semilla estable derivada del texto. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: PRNG determinista. */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Estilo por letra de un título en nota de rescate. El mismo texto siempre produce el mismo resultado. */
export function ransomLetters(text: string): RansomGlyph[] {
  const next = random(hash(text));
  let previous = -1;
  return [...text].map((char): RansomGlyph => {
    if (char === ' ') return { kind: 'space' };
    let look = Math.floor(next() * LOOKS.length);
    if (look === previous) look = (look + 1) % LOOKS.length;
    previous = look;
    const rotate = ROTATIONS[Math.floor(next() * ROTATIONS.length)];
    return { kind: 'letter', char, ...LOOKS[look], rotate };
  });
}
```

`src/theme/shapes.ts`:
```ts
export type Point = readonly [number, number];

/** Paralelogramo inclinado `skewDeg` grados dentro de una caja `width × height`. */
export function slantedRect(width: number, height: number, skewDeg: number): Point[] {
  const raw = Math.abs(Math.tan((skewDeg * Math.PI) / 180) * height);
  const offset = Math.min(raw, width / 2);
  if (offset === 0) return [[0, 0], [width, 0], [width, height], [0, height]];
  return skewDeg < 0
    ? [[offset, 0], [width, 0], [width - offset, height], [0, height]]
    : [[0, 0], [width - offset, 0], [width, height], [offset, height]];
}

/** Rectángulo con el borde inferior dentado: `teeth` dientes de profundidad `depth`. */
export function jaggedRect(width: number, height: number, teeth: number, depth: number): Point[] {
  const step = width / teeth;
  const base = height - Math.min(depth, height);
  const points: Point[] = [[0, 0], [width, 0]];
  for (let i = teeth; i > 0; i--) {
    points.push([i * step, height]);
    points.push([i * step - step / 2, base]);
  }
  points.push([0, height]);
  return points;
}

export function toSvgPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}
```

`src/theme/progress.ts`:
```ts
export type ProgressTone = 'normal' | 'warning' | 'over';

export interface ProgressState {
  /** Porción de la barra a pintar, entre 0 y 1. */
  fill: number;
  /** Porcentaje gastado, redondeado hacia abajo (79.98 % se muestra 79 %). */
  percent: number;
  tone: ProgressTone;
}

/** Estado de la barra de presupuesto. Umbrales: 80 % (aviso) y 100 % (pasado). */
export function progressState(spent: number, limit: number): ProgressState {
  if (limit <= 0) throw new Error('limit must be greater than 0');
  const ratio = Math.max(spent, 0) / limit;
  const tone: ProgressTone = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'normal';
  return { fill: Math.min(ratio, 1), percent: Math.floor(ratio * 100), tone };
}
```

`src/theme/backdrops.ts`:
```ts
/** Forma roja de fondo por pestaña (reemplaza las poses de personaje del juego). Orden = orden de pestañas. */
export interface Backdrop {
  top: number;
  right: number;
  width: number;
  height: number;
  rotate: number;
}

export const BACKDROPS: readonly Backdrop[] = [
  { top: -40, right: -60, width: 260, height: 200, rotate: -14 },
  { top: -20, right: -120, width: 300, height: 140, rotate: -10 },
  { top: 40, right: -80, width: 220, height: 260, rotate: -18 },
  { top: -60, right: -20, width: 200, height: 180, rotate: -8 },
  { top: 10, right: -140, width: 320, height: 120, rotate: -14 },
];
```

- [ ] **Step 4: Verlos pasar**

Run: `bun run test`
Expected: PASS — ransom (7), shapes (6), progress (6), motion-tokens (2).

- [ ] **Step 5: Implementar los módulos con React Native**

`src/theme/motion.ts`:
```ts
import {
  FadeIn,
  useReducedMotion,
  withSpring,
  withTiming,
  type EntryAnimationsValues,
} from 'react-native-reanimated';
import { durations, springs } from './motion-tokens';

/** `reduced` es true si Android tiene activado "reducir animaciones". */
export function useMotionPreference(): { reduced: boolean } {
  return { reduced: useReducedMotion() };
}

/** Anima hacia `target` con el token pedido, o con un fundido corto si el usuario redujo animaciones. */
export function animateTo(target: number, kind: 'snap' | 'slam', reduced: boolean) {
  'worklet';
  return reduced ? withTiming(target, { duration: durations.reducedFade }) : withSpring(target, springs[kind]);
}

/** Entrada `slam`: llega en diagonal desde abajo-izquierda con rebote. */
export function slamIn(values: EntryAnimationsValues) {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateX: -values.targetWidth * 0.6 }, { translateY: 40 }],
    },
    animations: {
      opacity: withTiming(1, { duration: durations.tap }),
      transform: [{ translateX: withSpring(0, springs.slam) }, { translateY: withSpring(0, springs.slam) }],
    },
  };
}

export const fadeInReduced = FadeIn.duration(durations.reducedFade);

/** Animación de entrada según la preferencia de movimiento. */
export function enteringFor(reduced: boolean) {
  return reduced ? fadeInReduced : slamIn;
}
```

`src/lib/haptics.ts`:
```ts
import * as Haptics from 'expo-haptics';

/** Vibración leve al tocar. Si el dispositivo no la soporta, no pasa nada. */
export function tapFeedback(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
```

- [ ] **Step 6: Check y commit**

Run: `bun run check`
Expected: verde (typecheck compila `motion.ts` con los tipos de Reanimated).
Run: `bun run verify:bundle`
Expected: exporta sin errores.
```bash
git add src/theme src/lib/haptics.ts tests/unit/src/theme
git commit -m "feat(app): add design tokens, motion, ransom note, shapes and progress logic" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Componentes base de tipografía y superficie (`Amount`, `RansomText`, `SlantPanel`, `SkewButton`, `SkewRow`, `TextField`)

**Files:**
- Create: `src/components/Amount.tsx`, `src/components/RansomText.tsx`, `src/components/SlantPanel.tsx`, `src/components/SkewButton.tsx`, `src/components/SkewRow.tsx`, `src/components/TextField.tsx`

**Interfaces:**
- Consumes: `formatMoney`, `moneyAccessibilityLabel` (Task 2); `colors`, `fonts`, `typeScale`, `angles`, `MIN_TOUCH`, `ransomLetters`, `slantedRect`, `jaggedRect`, `toSvgPoints`, `useMotionPreference`, `animateTo`, `enteringFor`, `durations`, `tapFeedback` (Task 3); `Currency` (Task 1).
- Produces:
  - `<Amount value={number} currency={Currency} size?: 'hero' | 'row' tone?: ColorToken />`
  - `<RansomText text={string} size?: 'lg' | 'md' | 'sm' animate?: boolean />`
  - `<SlantPanel color?: ColorToken skew?: number jagged?: boolean padding?: number style?: StyleProp<ViewStyle>>{children}</SlantPanel>`
  - `<SkewButton label={string} onPress={() => void} variant?: 'primary' | 'ghost' loading?: boolean accessibilityHint?: string />`
  - `<SkewRow title={string} subtitle?: string amount?: { value: number; currency: Currency } selected?: boolean onPress?: () => void />`
  - `<TextField label={string} value={string} onChangeText={(v: string) => void} secureTextEntry?: boolean keyboardType?: KeyboardTypeOptions autoComplete?: TextInputProps['autoComplete'] />`

Sin tests automáticos (componentes): se verifican con typecheck, lint, export y luego en la galería (Task 6).

- [ ] **Step 1: `Amount`**

`src/components/Amount.tsx`:
```tsx
import { Text } from 'react-native';
import { formatMoney, moneyAccessibilityLabel } from '@/lib/money';
import { colors, fonts, typeScale, type ColorToken } from '@/theme/tokens';
import type { Currency } from '@/types/database';

interface Props {
  value: number;
  currency: Currency;
  size?: 'hero' | 'row';
  tone?: ColorToken;
}

/** Monto. Regla del spec: nunca se inclina ni usa nota de rescate. */
export function Amount({ value, currency, size = 'row', tone = 'paper' }: Props) {
  return (
    <Text
      accessibilityLabel={moneyAccessibilityLabel(value, currency)}
      style={{
        fontFamily: fonts.amount,
        fontSize: size === 'hero' ? typeScale.amountHero : typeScale.amountRow,
        lineHeight: size === 'hero' ? typeScale.amountHero : typeScale.amountRow * 1.25,
        color: colors[tone],
        fontVariant: ['tabular-nums'],
      }}
    >
      {formatMoney(value, currency)}
    </Text>
  );
}
```

- [ ] **Step 2: `RansomText`**

`src/components/RansomText.tsx`:
```tsx
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { ransomLetters } from '@/theme/ransom';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

const SIZE = { lg: typeScale.displayLg, md: typeScale.displayMd, sm: typeScale.displaySm } as const;

interface Props {
  text: string;
  size?: keyof typeof SIZE;
  /** Entra con `slam` al montarse (títulos de pantalla). */
  animate?: boolean;
}

/** Título en nota de rescate. El lector de pantalla lee la palabra completa, no letra por letra. */
export function RansomText({ text, size = 'lg', animate = false }: Props) {
  const { reduced } = useMotionPreference();
  const glyphs = useMemo(() => ransomLetters(text), [text]);
  const fontSize = SIZE[size];
  return (
    <Animated.View
      entering={animate ? enteringFor(reduced) : undefined}
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}
      style={{ flexDirection: 'row', flexWrap: 'wrap', transform: [{ rotate: `${angles.title}deg` }] }}
    >
      {glyphs.map((g, i) =>
        g.kind === 'space' ? (
          <View key={i} style={{ width: fontSize * 0.35 }} />
        ) : (
          <Text
            key={i}
            importantForAccessibility="no"
            style={{
              fontFamily: fonts.display,
              fontSize,
              lineHeight: fontSize * 1.2,
              color: colors[g.color],
              backgroundColor: colors[g.background],
              borderWidth: g.bordered ? 2 : 0,
              borderColor: colors.paper,
              paddingHorizontal: 4,
              marginHorizontal: 1,
              transform: [{ rotate: `${g.rotate}deg` }],
            }}
          >
            {g.char}
          </Text>
        ),
      )}
    </Animated.View>
  );
}
```

- [ ] **Step 3: `SlantPanel`**

`src/components/SlantPanel.tsx`:
```tsx
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { jaggedRect, slantedRect, toSvgPoints } from '@/theme/shapes';
import { angles, colors, type ColorToken } from '@/theme/tokens';

interface Props {
  children?: ReactNode;
  color?: ColorToken;
  /** Inclinación en grados; por defecto la de las tiras (-8). */
  skew?: number;
  /** Borde inferior dentado en vez de inclinado. */
  jagged?: boolean;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fondo de polígono inclinado o dentado; el contenido queda derecho. */
export function SlantPanel({ children, color = 'panel', skew = angles.row, jagged = false, padding = 16, style }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };
  const points =
    size.width > 0
      ? toSvgPoints(jagged ? jaggedRect(size.width, size.height, 14, 8) : slantedRect(size.width, size.height, skew))
      : '';
  return (
    <View onLayout={onLayout} style={[{ padding }, style]}>
      {size.width > 0 && (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Polygon points={points} fill={colors[color]} />
        </Svg>
      )}
      {children}
    </View>
  );
}
```

- [ ] **Step 4: `SkewButton`**

`src/components/SkewButton.tsx`:
```tsx
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tapFeedback } from '@/lib/haptics';
import { useMotionPreference } from '@/theme/motion';
import { durations } from '@/theme/motion-tokens';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  accessibilityHint?: string;
}

/** Botón inclinado: al tocarlo se hunde 4 dp en diagonal y vibra (sin desplazamiento si se redujeron animaciones). */
export function SkewButton({ label, onPress, variant = 'primary', loading = false, accessibilityHint }: Props) {
  const { reduced } = useMotionPreference();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [
      { skewX: `${angles.row}deg` },
      { translateX: pressed.value * 4 },
      { translateY: pressed.value * 2 },
    ],
  }));
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      onPressIn={() => {
        if (!reduced) pressed.value = withTiming(1, { duration: durations.tap });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: durations.tap });
      }}
      style={{ minHeight: MIN_TOUCH }}
    >
      <Animated.View
        style={[
          {
            minHeight: MIN_TOUCH,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: primary ? colors.blood : 'transparent',
            borderWidth: primary ? 0 : 2,
            borderColor: colors.paper,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.paper} />
        ) : (
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: typeScale.displaySm,
              color: colors.paper,
              transform: [{ skewX: `${-angles.row}deg` }],
            }}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 5: `SkewRow`**

`src/components/SkewRow.tsx`:
```tsx
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tapFeedback } from '@/lib/haptics';
import { useMotionPreference } from '@/theme/motion';
import { durations } from '@/theme/motion-tokens';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';
import { Amount } from './Amount';

interface Props {
  title: string;
  subtitle?: string;
  amount?: { value: number; currency: Currency };
  /** Tira blanca con texto negro. */
  selected?: boolean;
  onPress?: () => void;
}

/** Tira de lista inclinada -8°. El contenido (y sobre todo el monto) queda derecho. */
export function SkewRow({ title, subtitle, amount, selected = false, onPress }: Props) {
  const { reduced } = useMotionPreference();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ skewX: `${angles.row}deg` }, { translateX: pressed.value * 6 }],
  }));
  const fg = selected ? 'void' : 'paper';
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      onPressIn={() => {
        if (!reduced) pressed.value = withTiming(1, { duration: durations.tap });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: durations.tap });
      }}
    >
      <Animated.View
        style={[
          {
            minHeight: MIN_TOUCH,
            marginVertical: 3,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: selected ? colors.paper : colors.panel,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          style,
        ]}
      >
        <View style={{ flexShrink: 1, transform: [{ skewX: `${-angles.row}deg` }] }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors[fg] }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: selected ? colors.void : colors.ash }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {amount ? (
          <View style={{ marginLeft: 12, transform: [{ skewX: `${-angles.row}deg` }] }}>
            <Amount value={amount.value} currency={amount.currency} tone={fg} />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 6: `TextField`**

`src/components/TextField.tsx`:
```tsx
import { useState } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
}

/** Campo de texto: etiqueta arriba, caja `panel` con barra roja a la izquierda cuando tiene foco. */
export function TextField({ label, value, onChangeText, secureTextEntry, keyboardType, autoComplete }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.ash}
        selectionColor={colors.blood}
        style={{
          minHeight: MIN_TOUCH,
          paddingHorizontal: 14,
          backgroundColor: colors.panel,
          borderLeftWidth: 4,
          borderLeftColor: focused ? colors.blood : colors.panel,
          color: colors.paper,
          fontFamily: fonts.body,
          fontSize: typeScale.body,
        }}
      />
    </View>
  );
}
```

- [ ] **Step 7: Verificar y commit**

Run: `bun run check`
Expected: verde.
Run: `bun run verify:bundle`
Expected: exporta sin errores.
```bash
git add src/components
git commit -m "feat(app): add amount, ransom text, slant panel, skew button, skew row and text field" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Componentes de estado y capas (`JaggedProgress`, `SlamSheet`, `CallingCard`, `Screen`)

**Files:**
- Create: `src/components/JaggedProgress.tsx`, `src/components/SlamSheet.tsx`, `src/components/CallingCard.tsx`, `src/components/Screen.tsx`

**Interfaces:**
- Consumes: `progressState`, `jaggedRect`, `toSvgPoints`, `animateTo`, `useMotionPreference`, `enteringFor`, `BACKDROPS`, tokens (Task 3); `formatMoney` (Task 2); `RansomText`, `SkewButton` (Task 4).
- Produces:
  - `<JaggedProgress spent={number} limit={number} currency={Currency} />`
  - `<SlamSheet visible={boolean} onClose={() => void} title={string}>{children}</SlamSheet>`
  - `<CallingCard title={string} message={string} tone?: 'blood' | 'signal' onDismiss={() => void} />`
  - `<Screen title={string} backdrop={number}>{children}</Screen>` — `backdrop` es el índice en `BACKDROPS` (0–4).

- [ ] **Step 1: `JaggedProgress`**

`src/components/JaggedProgress.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { formatMoney } from '@/lib/money';
import { animateTo, useMotionPreference } from '@/theme/motion';
import { progressState } from '@/theme/progress';
import { jaggedRect, toSvgPoints } from '@/theme/shapes';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';

const HEIGHT = 28;

interface Props {
  spent: number;
  limit: number;
  currency: Currency;
}

/** Barra de presupuesto: roja; borde amarillo desde el 80 %; desde el 100 % el extremo se "rompe". */
export function JaggedProgress({ spent, limit, currency }: Props) {
  const { reduced } = useMotionPreference();
  const state = progressState(spent, limit);
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = animateTo(state.fill, 'snap', reduced);
  }, [fill, state.fill, reduced]);
  const fillStyle = useAnimatedStyle(() => ({ width: fill.value * width }));
  const label = `${state.percent}% de ${formatMoney(limit, currency)}`;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Presupuesto: ${label}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(state.percent, 100) }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: HEIGHT, backgroundColor: colors.panel, overflow: 'hidden' }}
    >
      <Animated.View
        style={[
          {
            height: HEIGHT,
            backgroundColor: colors.blood,
            borderRightWidth: state.tone === 'normal' ? 0 : 4,
            borderRightColor: colors.signal,
          },
          fillStyle,
        ]}
      />
      {state.tone === 'over' && width > 0 ? (
        <Svg width={36} height={HEIGHT} style={{ position: 'absolute', right: 0, top: 0 }}>
          <Polygon points={toSvgPoints(jaggedRect(36, HEIGHT, 4, 10))} fill={colors.paper} />
        </Svg>
      ) : null}
      <Text
        style={{
          position: 'absolute',
          left: 10,
          top: 4,
          fontFamily: fonts.amount,
          fontSize: typeScale.body,
          color: colors.paper,
          fontVariant: ['tabular-nums'],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: `SlamSheet`**

`src/components/SlamSheet.tsx`:
```tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Panel para formularios: entra en diagonal (`slam`) sobre un velo negro; tocar el velo lo cierra. */
export function SlamSheet({ visible, onClose, title, children }: Props) {
  const { reduced } = useMotionPreference();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim }}
        />
        {visible ? (
          <Animated.View
            entering={enteringFor(reduced)}
            style={{
              backgroundColor: colors.panel,
              borderTopWidth: 4,
              borderTopColor: colors.blood,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 24 + insets.bottom,
            }}
          >
            <View style={{ marginBottom: 20 }}>
              <RansomText text={title} size="md" />
            </View>
            {children}
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: `CallingCard`**

`src/components/CallingCard.tsx`:
```tsx
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';
import { RansomText } from './RansomText';
import { SkewButton } from './SkewButton';

interface Props {
  title: string;
  message: string;
  /** `blood` para el 100 % y anuncios; `signal` solo para el aviso del 80 %. */
  tone?: 'blood' | 'signal';
  onDismiss: () => void;
}

/** Tarjeta de anuncio grande: entra con `slam` y queda girada -4°, con una esquina en el color del tono. */
export function CallingCard({ title, message, tone = 'blood', onDismiss }: Props) {
  const { reduced } = useMotionPreference();
  return (
    <Animated.View
      entering={enteringFor(reduced)}
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.void,
        borderWidth: 4,
        borderColor: colors[tone],
        padding: 20,
        transform: [{ rotate: `${angles.title}deg` }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -12,
          right: -12,
          width: 64,
          height: 64,
          backgroundColor: colors[tone],
          transform: [{ rotate: `${angles.backdrop}deg` }],
        }}
      />
      <RansomText text={title} size="md" />
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: typeScale.body,
          color: colors.paper,
          marginTop: 16,
          marginBottom: 20,
          lineHeight: typeScale.body * 1.4,
        }}
      >
        {message}
      </Text>
      <SkewButton label="Entendido" onPress={onDismiss} variant="ghost" />
    </Animated.View>
  );
}
```

- [ ] **Step 4: `Screen`**

`src/components/Screen.tsx`:
```tsx
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKDROPS } from '@/theme/backdrops';
import { enteringFor, useMotionPreference } from '@/theme/motion';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';

interface Props {
  title: string;
  /** Índice de la forma de fondo (0–4); una por pestaña. */
  backdrop: number;
  children?: ReactNode;
}

/** Contenedor de pantalla: fondo `void`, forma roja de la pestaña, título en nota de rescate. */
export function Screen({ title, backdrop, children }: Props) {
  const { reduced } = useMotionPreference();
  const shape = BACKDROPS[backdrop % BACKDROPS.length];
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.void }}>
      <Animated.View
        entering={enteringFor(reduced)}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: shape.top,
          right: shape.right,
          width: shape.width,
          height: shape.height,
          backgroundColor: colors.blood,
          transform: [{ rotate: `${shape.rotate}deg` }],
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={{ marginTop: 12, marginBottom: 24 }}>
          <RansomText text={title} animate />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Verificar y commit**

Run: `bun run check`
Expected: verde.
Run: `bun run verify:bundle`
Expected: exporta sin errores.
```bash
git add src/components/JaggedProgress.tsx src/components/SlamSheet.tsx src/components/CallingCard.tsx src/components/Screen.tsx
git commit -m "feat(app): add jagged progress, slam sheet, calling card and screen container" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cliente de Supabase, env y lógica de auth

**Files:**
- Create: `src/lib/env-schema.ts`, `src/lib/env.ts`, `src/lib/supabase.ts`, `src/lib/queryClient.ts`, `src/features/auth/errors.ts`, `src/features/auth/api.ts`, `src/features/auth/hooks.ts`
- Test: `tests/unit/src/lib/env-schema.test.ts`, `tests/unit/src/features/auth/errors.test.ts`

**Interfaces:**
- Consumes: `Database` (Task 1).
- Produces:
  - `parseEnv(raw: Record<string, string | undefined>): Env`, `type Env = { EXPO_PUBLIC_SUPABASE_URL: string; EXPO_PUBLIC_SUPABASE_ANON_KEY: string }`
  - `env: Env` (único lector de `process.env`)
  - `supabase: SupabaseClient<Database>`
  - `queryClient: QueryClient`
  - `authErrorMessage(error: AuthErrorLike | null): string | null`, `interface AuthErrorLike { name?: string; code?: string; status?: number }`
  - `signIn(email: string, password: string): Promise<string | null>` (devuelve el mensaje de error en español o `null`)
  - `signOut(): Promise<void>`
  - `useSession(): { session: Session | null; loading: boolean }`

**Prerrequisito:** el controller agrega a `.env.local` (gitignored) `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (clave publicable del proyecto). El implementer no los escribe en ningún archivo versionado.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/src/lib/env-schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env-schema';

const valid = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_0123456789abcdef',
};

describe('parseEnv', () => {
  it('accepts a valid configuration', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });
  it('names every missing variable in the error', () => {
    expect(() => parseEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL.*EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
  it('rejects a URL that is not a URL', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
  it('rejects a suspiciously short key', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'short' })).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
```

`tests/unit/src/features/auth/errors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '@/features/auth/errors';

describe('authErrorMessage', () => {
  it('returns null when there is no error', () => {
    expect(authErrorMessage(null)).toBeNull();
  });
  it('explains wrong credentials', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe('Correo o contraseña incorrectos.');
  });
  it('explains an unconfirmed account', () => {
    expect(authErrorMessage({ code: 'email_not_confirmed', status: 400 })).toBe(
      'Tu cuenta no está confirmada. Pídele al administrador que la confirme.',
    );
  });
  it('explains rate limiting', () => {
    expect(authErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toBe(
      'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
    );
  });
  it('explains a network failure', () => {
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      'Sin conexión. Revisa tu internet y vuelve a intentarlo.',
    );
  });
  it('falls back to a generic message without leaking the raw error', () => {
    expect(authErrorMessage({ code: 'unexpected_failure', status: 500 })).toBe(
      'No se pudo iniciar sesión. Vuelve a intentarlo.',
    );
  });
});
```

- [ ] **Step 2: Verlos fallar**

Run: `bun run test`
Expected: FAIL — no se resuelven `@/lib/env-schema` ni `@/features/auth/errors`.

- [ ] **Step 3: Implementar los módulos puros**

`src/lib/env-schema.ts`:
```ts
import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export type Env = z.infer<typeof schema>;

/** Valida la configuración pública de la app. El error nombra cada variable inválida. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas o ausentes: ${names}`);
  }
  return result.data;
}
```

`src/features/auth/errors.ts`:
```ts
export interface AuthErrorLike {
  name?: string;
  code?: string;
  status?: number;
}

/** Traduce un error de Supabase Auth a un mensaje en español que dice qué pasó y qué hacer. */
export function authErrorMessage(error: AuthErrorLike | null): string | null {
  if (!error) return null;
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return 'Sin conexión. Revisa tu internet y vuelve a intentarlo.';
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'email_not_confirmed':
      return 'Tu cuenta no está confirmada. Pídele al administrador que la confirme.';
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    default:
      return 'No se pudo iniciar sesión. Vuelve a intentarlo.';
  }
}
```

- [ ] **Step 4: Verlos pasar**

Run: `bun run test`
Expected: PASS — env-schema (4) y errors (6).

- [ ] **Step 5: Implementar cliente, env y API de auth**

`src/lib/env.ts`:
```ts
import { parseEnv } from './env-schema';

// Único archivo que lee process.env. Acceso estático por nombre para que Expo inyecte los valores.
export const env = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
```

`src/lib/supabase.ts`:
```ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import type { Database } from '@/types/database';
import { env } from './env';

/**
 * SecureStore no admite valores de más de ~2 KB y la sesión puede superarlo: la clave AES-256 vive en
 * SecureStore y la sesión cifrada en AsyncStorage (patrón recomendado por Supabase para Expo).
 */
class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const keyHex = await SecureStore.getItemAsync(key);
    if (!keyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    return encrypted ? this.decrypt(key, encrypted) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, await this.encrypt(key, value));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

export const supabase = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresca el token solo mientras la app está en primer plano.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```

`src/lib/queryClient.ts`:
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
```

`src/features/auth/api.ts`:
```ts
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from './errors';

/** Inicia sesión. Devuelve el mensaje de error en español, o `null` si salió bien. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return authErrorMessage(error);
}

/** Cierra sesión y descarta los datos en caché del usuario anterior. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  queryClient.clear();
}
```

`src/features/auth/hooks.ts`:
```ts
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Sesión actual de Supabase; `loading` es true hasta leerla del almacenamiento cifrado. */
export function useSession(): { session: Session | null; loading: boolean } {
  const [state, setState] = useState<{ session: Session | null; loading: boolean }>({ session: null, loading: true });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}
```

- [ ] **Step 6: Verificar y commit**

Run: `bun run check`
Expected: verde.
Run: `bun run verify:bundle`
Expected: exporta sin errores (con `.env.local` presente; si faltan las variables, el export igual compila porque `parseEnv` corre en el dispositivo, no al empaquetar).
```bash
git add src/lib/env-schema.ts src/lib/env.ts src/lib/supabase.ts src/lib/queryClient.ts src/features/auth tests/unit/src/lib/env-schema.test.ts tests/unit/src/features/auth/errors.test.ts
git commit -m "feat(app): add env validation, encrypted supabase session and auth logic" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `SlamTabBar`, rutas protegidas, login y pestañas

**Files:**
- Create: `src/components/SlamTabBar.tsx`, `src/features/auth/components/LoginForm.tsx`, `src/features/auth/components/SignOutButton.tsx`, `app/(auth)/login.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/transactions.tsx`, `app/(tabs)/history.tsx`, `app/(tabs)/budget.tsx`, `app/(tabs)/settings.tsx`
- Modify: `app/_layout.tsx`
- Delete: `app/index.tsx`

**Interfaces:**
- Consumes: `useSession`, `signIn`, `signOut` (Task 6); `queryClient` (Task 6); `Screen`, `SkewButton`, `TextField`, `SlantPanel`, `RansomText` (Tasks 4–5); `animateTo`, `useMotionPreference`, `tapFeedback`, tokens (Task 3).
- Produces: `<SlamTabBar {...BottomTabBarProps} />`; rutas `/` (inicio), `/transactions`, `/history`, `/budget`, `/settings`, `/login`; el acceso a `/dev/gallery` lo agrega la Task 8.

- [ ] **Step 1: `SlamTabBar`**

`src/components/SlamTabBar.tsx`:
```tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapFeedback } from '@/lib/haptics';
import { animateTo, useMotionPreference } from '@/theme/motion';
import { angles, colors, MIN_TOUCH } from '@/theme/tokens';

/** Barra de pestañas: un bloque rojo inclinado salta a la pestaña elegida con `snap`. */
export function SlamTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { reduced } = useMotionPreference();
  const [width, setWidth] = useState(0);
  const slot = width / state.routes.length;
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = animateTo(state.index * slot, 'snap', reduced);
  }, [x, state.index, slot, reduced]);
  const highlight = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { skewX: `${angles.backdrop}deg` }, { rotate: `${angles.title}deg` }],
  }));
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.void,
        borderTopWidth: 3,
        borderTopColor: colors.blood,
        paddingTop: 6,
        paddingBottom: 6 + insets.bottom,
      }}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 8, left: slot * 0.15, width: slot * 0.7, height: 40, backgroundColor: colors.blood },
            highlight,
          ]}
        />
      ) : null}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const onPress = () => {
          tapFeedback();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.title}
            onPress={onPress}
            style={{ flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
          >
            {options.tabBarIcon?.({ focused, color: focused ? colors.paper : colors.ash, size: 22 })}
          </Pressable>
        );
      })}
    </View>
  );
}
```
Si `@react-navigation/bottom-tabs` no se resuelve como import directo, instalarlo con `bunx expo install @react-navigation/bottom-tabs` (Expo Router lo usa internamente) y anotarlo en el reporte.

- [ ] **Step 2: Formulario de login y botón de cierre de sesión**

`src/features/auth/components/LoginForm.tsx`:
```tsx
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { TextField } from '@/components/TextField';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { signIn } from '../api';

/** Login con correo y contraseña. No hay registro ni recuperación por correo (CLAUDE.md). */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({ mutationFn: () => signIn(email, password) });
  const error = login.data ?? null;
  return (
    <View>
      <TextField label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal, marginBottom: 12 }}
        >
          {error}
        </Text>
      ) : null}
      <SkewButton label="Entrar" onPress={() => login.mutate()} loading={login.isPending} />
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: colors.ash, marginTop: 20 }}>
        Si olvidaste tu contraseña, pídele al administrador que la restablezca.
      </Text>
    </View>
  );
}
```

`src/features/auth/components/SignOutButton.tsx`:
```tsx
import { useMutation } from '@tanstack/react-query';
import { SkewButton } from '@/components/SkewButton';
import { signOut } from '../api';

export function SignOutButton() {
  const logout = useMutation({ mutationFn: signOut });
  return <SkewButton label="Cerrar sesión" variant="ghost" onPress={() => logout.mutate()} loading={logout.isPending} />;
}
```

- [ ] **Step 3: Layout raíz con rutas protegidas**

`app/_layout.tsx` (reemplazar completo):
```tsx
import '../global.css';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '@/features/auth/hooks';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Anton_400Regular, Barlow_400Regular, Barlow_500Medium, BarlowCondensed_500Medium });
  const { session, loading } = useSession();
  const ready = fontsLoaded && !loading;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  const signedIn = session !== null;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.void }, animation: 'fade' }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)/login" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```
Si la versión instalada de Expo Router no expone `Stack.Protected`, reportar BLOCKED con la versión: no improvisar otro mecanismo de redirección.

Eliminar `app/index.tsx` (la ruta `/` pasa a ser `app/(tabs)/index.tsx`).

- [ ] **Step 4: Pantalla de login**

`app/(auth)/login.tsx`:
```tsx
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RansomText } from '@/components/RansomText';
import { SlantPanel } from '@/components/SlantPanel';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { angles, colors } from '@/theme/tokens';

export default function LoginScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <SlantPanel color="blood" skew={angles.backdrop} padding={28} style={{ marginBottom: 40 }}>
            <View style={{ alignItems: 'flex-start' }}>
              <RansomText text="RECIBO" animate />
            </View>
          </SlantPanel>
          <LoginForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Pestañas**

`app/(tabs)/_layout.tsx`:
```tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { SlamTabBar } from '@/components/SlamTabBar';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <SlamTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="transactions" options={{ title: 'Movimientos', tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="budget" options={{ title: 'Presupuesto', tabBarIcon: icon('flag-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
```

`app/(tabs)/index.tsx`:
```tsx
import { Screen } from '@/components/Screen';

export default function HomeScreen() {
  return <Screen title="ESTA SEMANA" backdrop={0} />;
}
```

`app/(tabs)/transactions.tsx`:
```tsx
import { Screen } from '@/components/Screen';

export default function TransactionsScreen() {
  return <Screen title="MOVIMIENTOS" backdrop={1} />;
}
```

`app/(tabs)/history.tsx`:
```tsx
import { Screen } from '@/components/Screen';

export default function HistoryScreen() {
  return <Screen title="HISTORIAL" backdrop={2} />;
}
```

`app/(tabs)/budget.tsx`:
```tsx
import { Screen } from '@/components/Screen';

export default function BudgetScreen() {
  return <Screen title="PRESUPUESTO" backdrop={3} />;
}
```

`app/(tabs)/settings.tsx`:
```tsx
import { Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { useSession } from '@/features/auth/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';

export default function SettingsScreen() {
  const { session } = useSession();
  return (
    <Screen title="AJUSTES" backdrop={4}>
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginBottom: 20 }}>
        Sesión iniciada como {session?.user.email}
      </Text>
      <SignOutButton />
    </Screen>
  );
}
```

- [ ] **Step 6: Verificar y commit**

Run: `bun run check`
Expected: verde.
Run: `bun run verify:bundle`
Expected: exporta sin errores; la salida lista las rutas `(auth)/login` y `(tabs)/*`.
```bash
git add src/components/SlamTabBar.tsx src/features/auth/components app
git commit -m "feat(app): add slam tab bar, protected routes, login and tab screens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(`git add app` registra también la eliminación de `app/index.tsx`.)

---

### Task 8: Galería de desarrollo

**Files:**
- Create: `app/dev/gallery.tsx`
- Modify: `app/_layout.tsx` (ruta protegida de la galería), `app/(tabs)/settings.tsx` (botón "Abrir galería" solo en `__DEV__`)

**Interfaces:**
- Consumes: todos los componentes de las Tasks 4, 5 y 7.
- Produces: ruta `/dev/gallery`, accesible solo con sesión iniciada y `__DEV__`.

- [ ] **Step 1: Pantalla de galería**

`app/dev/gallery.tsx`:
```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Amount } from '@/components/Amount';
import { CallingCard } from '@/components/CallingCard';
import { JaggedProgress } from '@/components/JaggedProgress';
import { RansomText } from '@/components/RansomText';
import { Screen } from '@/components/Screen';
import { SkewButton } from '@/components/SkewButton';
import { SkewRow } from '@/components/SkewRow';
import { SlamSheet } from '@/components/SlamSheet';
import { SlantPanel } from '@/components/SlantPanel';
import { TextField } from '@/components/TextField';
import { colors, fonts, typeScale } from '@/theme/tokens';

const SPENT_STEPS = [2700, 5100, 6000, 7400];

function Section({ name }: { name: string }) {
  return (
    <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginTop: 28, marginBottom: 10 }}>
      {name}
    </Text>
  );
}

/** Galería de componentes para revisar el estilo en el celular. Solo existe en desarrollo. */
export default function GalleryScreen() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [card, setCard] = useState<'blood' | 'signal' | null>(null);
  const [field, setField] = useState('');
  return (
    <Screen title="GALERÍA" backdrop={2}>
      <SkewButton label="Volver" variant="ghost" onPress={() => router.back()} />

      <Section name="Nota de rescate" />
      <RansomText text="ESTA SEMANA" />
      <View style={{ height: 12 }} />
      <RansomText text="ÚLTIMOS MOVIMIENTOS" size="sm" />

      <Section name="Montos" />
      <Amount value={4275.72} currency="DOP" size="hero" />
      <Amount value={12} currency="USD" />
      <Amount value={-434.22} currency="DOP" tone="ash" />

      <Section name="Barra de presupuesto (toca para cambiar)" />
      <JaggedProgress spent={SPENT_STEPS[step]} limit={6000} currency="DOP" />
      <View style={{ height: 12 }} />
      <SkewButton label="Siguiente estado" variant="ghost" onPress={() => setStep((s) => (s + 1) % SPENT_STEPS.length)} />

      <Section name="Tiras de lista" />
      {['UBER*RIDES', 'SUPERMERCADO NACIONAL', 'NETFLIX.COM'].map((title, i) => (
        <SkewRow
          key={title}
          title={title}
          subtitle={i === 2 ? 'Entretenimiento' : 'Sin categoría'}
          amount={i === 2 ? { value: 12, currency: 'USD' } : { value: i === 0 ? 275.72 : 2140, currency: 'DOP' }}
          selected={selected === i}
          onPress={() => setSelected(i)}
        />
      ))}

      <Section name="Paneles" />
      <SlantPanel color="blood">
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper }}>Panel inclinado</Text>
      </SlantPanel>
      <View style={{ height: 12 }} />
      <SlantPanel jagged>
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper }}>Panel dentado</Text>
      </SlantPanel>

      <Section name="Campo de texto" />
      <TextField label="Comercio" value={field} onChangeText={setField} />

      <Section name="Botones" />
      <SkewButton label="Agregar gasto" onPress={() => setSheet(true)} />
      <View style={{ height: 12 }} />
      <SkewButton label="Aviso al 80 %" variant="ghost" onPress={() => setCard('signal')} />
      <View style={{ height: 12 }} />
      <SkewButton label="Aviso al 100 %" variant="ghost" onPress={() => setCard('blood')} />

      {card ? (
        <View style={{ marginTop: 24 }}>
          <CallingCard
            tone={card}
            title={card === 'signal' ? 'CUIDADO' : 'TE PASASTE'}
            message={
              card === 'signal'
                ? 'Llevas el 85 % de tu presupuesto semanal.'
                : 'Gastaste RD$ 7,400.00 de RD$ 6,000.00 esta semana.'
            }
            onDismiss={() => setCard(null)}
          />
        </View>
      ) : null}

      <SlamSheet visible={sheet} onClose={() => setSheet(false)} title="NUEVO GASTO">
        <TextField label="Monto" value="" onChangeText={() => undefined} keyboardType="decimal-pad" />
        <SkewButton label="Guardar" onPress={() => setSheet(false)} />
      </SlamSheet>
    </Screen>
  );
}
```

- [ ] **Step 2: Registrar la ruta y el acceso**

En `app/_layout.tsx`, agregar un bloque hermano justo después del `<Stack.Protected guard={signedIn}>` existente (no anidado):
```tsx
          <Stack.Protected guard={signedIn && __DEV__}>
            <Stack.Screen name="dev/gallery" />
          </Stack.Protected>
```

En `app/(tabs)/settings.tsx`, agregar el import `import { router } from 'expo-router';`, `import { View } from 'react-native';` (sumar `View` al import existente de `react-native`) y `import { SkewButton } from '@/components/SkewButton';`, y antes de `<SignOutButton />`:
```tsx
      {__DEV__ ? (
        <View style={{ marginBottom: 16 }}>
          <SkewButton label="Abrir galería" variant="ghost" onPress={() => router.push('/dev/gallery')} />
        </View>
      ) : null}
```

- [ ] **Step 3: Verificar y commit**

Run: `bun run check`
Expected: verde.
Run: `bun run verify:bundle`
Expected: exporta sin errores.
```bash
git add app/dev/gallery.tsx app/_layout.tsx "app/(tabs)/settings.tsx"
git commit -m "feat(app): add dev-only component gallery" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Documentación y checklist de verificación en el dispositivo

**Files:**
- Modify: `CLAUDE.md` (Comandos, Estructura clave, Convenciones de la app), `docs/superpowers/plans/2026-09-17-roadmap.md` (fila del Plan 4)
- Create: `docs/superpowers/plans/2026-10-06-plan-4a-device-checklist.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: documentación al día y la checklist que el usuario ejecuta en su Android.

- [ ] **Step 1: Actualizar `CLAUDE.md`**

En **Comandos**: reemplazar `# Desde Plan 4: bunx expo start` por:
```bash
bun run start                      # Expo (abrir con Expo Go en Android); requiere .env.local con EXPO_PUBLIC_*
bun run verify:bundle              # empaqueta Android sin dispositivo (verificación de Metro/Babel/NativeWind)
```
y cambiar el comentario de `bun run lint` a `# deno lint (supabase/functions) + expo lint (app)`.

En **Estructura clave**, bajo `src/`, agregar:
```
  theme/                   # tokens.ts + colors.json (paleta única), motion*, ransom, shapes, progress, backdrops
```
y bajo `app/` agregar `dev/gallery.tsx         # galería de componentes, solo __DEV__`.

En **Convenciones de la app**, agregar al final:
```
- Estilo visual: spec `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md`. Colores solo desde
  `src/theme` (ningún hex fuera de `colors.json`); los montos siempre con `Amount`/`formatMoney`,
  nunca inclinados; el rojo nunca en texto de menos de 18 px; toda animación pasa por
  `src/theme/motion.ts` y respeta "reducir animaciones".
- Componentes nuevos se revisan primero en la galería (`/dev/gallery`).
```

- [ ] **Step 2: Roadmap**

En la fila del Plan 4 de `docs/superpowers/plans/2026-09-17-roadmap.md`, cambiar el estado a `4a ejecutado; 4b y 4c pendientes` y agregar en la celda del nombre: `— spec 2026-10-06-plan-4-ui-design.md`.

- [ ] **Step 3: Checklist de verificación en el dispositivo**

`docs/superpowers/plans/2026-10-06-plan-4a-device-checklist.md`:
```markdown
# Plan 4a — checklist en el dispositivo

Requisitos: Expo Go instalado en el Android; `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY`; celular y computadora en la misma red. Ejecutar `bun run start`
y escanear el QR con Expo Go.

## Login
- [ ] La app abre en negro con el título RECIBO en nota de rescate sobre el panel rojo.
- [ ] Contraseña incorrecta → "Correo o contraseña incorrectos." en amarillo.
- [ ] Modo avión → "Sin conexión. Revisa tu internet y vuelve a intentarlo."
- [ ] Credenciales correctas → entra a Inicio.
- [ ] Cerrar Expo Go y volver a abrir → sigue con la sesión iniciada.

## Pestañas
- [ ] El bloque rojo salta a cada pestaña con un rebote corto y el celular vibra levemente.
- [ ] La forma roja del fondo cambia de lugar en cada pestaña.
- [ ] Cada título entra "de golpe" desde abajo a la izquierda.
- [ ] Ajustes muestra el correo y "Cerrar sesión" vuelve al login.

## Galería (Ajustes → Abrir galería)
- [ ] Los montos son rectos y las cifras no "bailan" al cambiar (ancho fijo).
- [ ] La barra de presupuesto pasa por 45 %, 85 % (borde amarillo), 100 % y 123 % (extremo roto).
- [ ] Tocar una tira la vuelve blanca con texto negro.
- [ ] "Agregar gasto" abre el panel en diagonal; tocar fuera lo cierra.
- [ ] Las tarjetas de aviso entran inclinadas y "Entendido" las cierra.

## Accesibilidad
- [ ] Activar Ajustes de Android → Accesibilidad → "Quitar animaciones": todo pasa a fundidos, sin rebotes.
- [ ] Con TalkBack, los títulos se leen como palabra completa y los montos como "4,275.72 pesos".

## Rendimiento
- [ ] Cambiar de pestaña rápido varias veces no se traba.
```

- [ ] **Step 4: Verificar y commit**

Run: `bun run check`
Expected: verde.
```bash
git add CLAUDE.md docs/superpowers/plans/2026-09-17-roadmap.md docs/superpowers/plans/2026-10-06-plan-4a-device-checklist.md
git commit -m "docs: document the app toolchain, design rules and plan 4a device checklist" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Criterio de éxito del Plan 4a

- `bun run check` y `bun run verify:bundle` en verde.
- Vitest cubre `money`, `dates`, `ransom`, `shapes`, `progress`, `motion-tokens`, `env-schema` y `errors`.
- El usuario completa la checklist del dispositivo: inicia sesión con su usuario real, recorre las pestañas y la galería, y "Quitar animaciones" cambia el movimiento a fundidos.
- Ningún color literal fuera de `src/theme/colors.json` (verificable con `grep -rnE "#[0-9A-Fa-f]{6}|rgba?\(" app src --include=*.tsx`, que no debe devolver nada).

## Fuera del Plan 4a

Pantallas con datos (4b); ceremonias, sonidos, push y APK (4c); vincular cuentas y sincronización (Plan 3).
