# Plan 4b-1 — Movimientos e Inicio con datos reales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el usuario registre gastos manuales (teclado propio, fecha Hoy/Ayer/Otro día), los vea, filtre, edite, ignore y borre en Movimientos, y vea en Inicio los totales de la semana y el mes con su presupuesto, todo contra Supabase real y con el estilo del Plan 4a.

**Architecture:** Primero se refuerza la base del 4a (sesión compartida por contexto, `ListScreen` con `FlatList`, `TextField` con todas las props, fechas robustas). Toda la lógica nueva es pura y vive en módulos sin React Native con tests de Vitest (teclado, filtros, agrupación, presentación de filas, fechas de gastos, comparaciones). La capa de datos usa TanStack Query con keys por dominio y las RPC del Plan 2; las pantallas en `src/features/*/components` solo componen y `app/` solo enruta.

**Tech Stack:** Expo SDK 57 + Expo Router 57, React Native 0.86, Reanimated 4.5, TanStack Query 5, `@supabase/supabase-js` 2, `@react-native-community/datetimepicker` (nuevo, vía `bunx expo install`), Vitest, Bun.

**Spec:** `docs/superpowers/specs/2026-10-06-plan-4b1-movimientos-inicio-design.md` (hereda `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md`). Leer ambos antes de cada tarea de UI.

## Global Constraints

- **Rama `dev`.** Nunca commitear en `main`. Cada commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (segundo `-m`). El repo es **público**: nada de datos personales ni secretos.
- **Bun siempre.** Nunca npm/npx/yarn. Dependencias de Expo con `bunx expo install`. La única dependencia nueva del plan es `@react-native-community/datetimepicker` (Task 6).
- **Solo Android, solo modo oscuro.** Colores solo desde `src/theme` (ningún hex ni `rgba(` en `.tsx` de `app/` o `src/`).
- **Reglas innegociables del spec 4:** los montos nunca se inclinan (siempre `Amount`/`formatMoney`/`formatAmountInput`); el rojo (`blood`) nunca en texto de menos de 18 px; pasarse del presupuesto nunca se celebra; toda animación pasa por `src/theme/motion.ts`; elementos con `entering` y rotación estática van en capas separadas.
- **Dinero en centavos enteros** en toda la lógica del cliente (`amount-input.ts`); el monto se envía como `cents / 100`.
- **Agregados en SQL:** los totales vienen de `get_spending_summary`; el cliente no suma montos.
- **Listados paginados:** `.range()` + `count: 'exact'`, páginas de 50.
- **TanStack Query** con keys en `src/features/<dominio>/keys.ts`; las mutaciones invalidan keys, nunca se edita la caché a mano.
- **`app/` solo enruta**; la lógica y los componentes de dominio viven en `src/features/<dominio>/`.
- **Un componente por archivo**, componentes funcionales, sin `console.log`. Textos de UI en español.
- **Sin migraciones** (el Plan 2 ya cubre las políticas necesarias). Gasto manual: `source = 'manual'`, `type = 'card_purchase'`.
- **Tests:** Vitest solo para lógica pura (TDD: test primero, verlo fallar, implementar). Sin tests de componentes (no instalar `@testing-library/react-native`).
- **Antes de commitear cada tarea:** `bun run check` en verde; las tareas que tocan `app/` o `src/components`/`src/features/*/components` también `bun run verify:bundle`.

## Notas para quien ejecute el plan (handoff)

- El usuario quiere ejecución **orquestada con subagentes en Sonnet**, en paralelo cuando las tareas no dependen entre sí (skill `superpowers:subagent-driven-development`, con revisión por tarea y revisión final de rama).
- **Oleadas:** A = {Task 1, Task 2, Task 3} en paralelo → B = {Task 4} → C = {Task 5} → D = {Task 6} → E = {Task 7, Task 8} en paralelo → F = {Task 9}.
- **Worktrees del harness (`isolation: worktree`):** nacen de un commit viejo (`eb14f21`). Cada implementer debe hacer `git merge --ff-only <BASE de su oleada>` antes de trabajar y `bun install` (en Windows puede fallar solo `@expo/sudo-prompt`: es inofensivo). Los subagentes **no pueden escribir fuera de su worktree**: piden el reporte en la respuesta. El controller integra las ramas a `dev` con `git cherry-pick` (historial lineal). `.claude/worktrees/` está en `.git/info/exclude`.
- `.env.local` (gitignored) ya tiene `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el checkout principal; los worktrees no lo tienen y no deben crearlo (`verify:bundle` compila sin él).
- Al final, el usuario corre la checklist de la Task 9 en su Android con Expo Go (`bun run start`).

## Mapa de archivos

| Archivo | Responsabilidad | Task |
|---|---|---|
| `src/features/auth/session-context.ts` | Contexto de sesión | 1 |
| `src/features/auth/SessionProvider.tsx` | Lee la sesión una vez; limpia la caché en `SIGNED_OUT` | 1 |
| `src/features/auth/hooks.ts` (mod.) | `useSession`, `useUserId` desde el contexto | 1 |
| `src/components/RootStack.tsx` | Fuentes, splash y rutas protegidas (antes en `_layout`) | 1 |
| `app/_layout.tsx` (mod.) | Solo providers | 1 |
| `src/components/TextField.tsx` (mod.) | Acepta `TextInputProps` y `error` | 1 |
| `src/features/auth/components/LoginForm.tsx` (mod.) | Enviar desde el teclado | 1 |
| `src/lib/dates.ts` (mod.) | Weekday por cálculo, caché por zona, zona inválida, `zonedInstant`, `addDays`, etc. | 2 |
| `src/theme/backdrops.ts` (mod.) | `BackdropIndex` | 2 |
| `src/components/ScreenBackdrop.tsx` | Forma roja de la pestaña (compartida) | 2 |
| `src/components/Screen.tsx` (mod.) | Modo scroll + `aboveTitle`, `floating`, `refreshControl` | 2 |
| `src/components/ListScreen.tsx` | Modo lista con `FlatList` | 2 |
| `src/components/SkewRow.tsx` (mod.) | `React.memo`, `badge`, `muted` | 2 |
| `src/lib/money.ts` (mod.) | Exporta `currencySymbol` | 3 |
| `src/features/transactions/amount-input.ts` | Reductor del teclado en centavos | 3 |
| `src/components/AmountKeypad.tsx`, `SkewChip.tsx`, `OptionSheet.tsx`, `PlaceholderRows.tsx` | UI genérica nueva | 3 |
| `src/types/database.ts` (mod.) | `BankCode`, `BudgetPeriod`, `TxSource` | 4 |
| `src/features/transactions/{filters,grouping,mapping,expense-date}.ts` | Lógica pura de movimientos | 4 |
| `src/features/summary/{comparison,mapping}.ts`, `src/features/categories/recent.ts`, `src/features/budgets/active.ts` | Lógica pura de resumen, categorías y presupuestos | 4 |
| `src/features/*/keys.ts`, `api.ts`, `hooks.ts` (transactions, summary, categories, budgets, profile) | Acceso a datos | 5 |
| `src/features/transactions/components/{ExpenseSheet,ExpenseForm}.tsx`, `src/components/AddFab.tsx` | Panel de gasto | 6 |
| `src/features/transactions/components/{TransactionsScreen,FilterBar,DayHeader,TransactionRow}.tsx`, `app/(tabs)/transactions.tsx` (mod.) | Movimientos | 7 |
| `src/features/summary/components/{HomeScreen,SummaryBlock,DayTag,RecentTransactions}.tsx`, `app/(tabs)/index.tsx` (mod.) | Inicio | 8 |
| `CLAUDE.md`, roadmap, `docs/superpowers/plans/2026-10-06-plan-4b1-device-checklist.md` | Documentación | 9 |

---

### Task 1: Sesión compartida y `TextField` completo

**Files:**
- Create: `src/features/auth/session-context.ts`, `src/features/auth/SessionProvider.tsx`, `src/components/RootStack.tsx`
- Modify: `src/features/auth/hooks.ts`, `app/_layout.tsx`, `src/components/TextField.tsx`, `src/features/auth/components/LoginForm.tsx`

**Interfaces:**
- Consumes: `supabase` (`@/lib/supabase`), `queryClient` (`@/lib/queryClient`).
- Produces:
  - `interface SessionState { session: Session | null; loading: boolean }`, `SessionContext`
  - `<SessionProvider>{children}</SessionProvider>`
  - `useSession(): SessionState` (lanza si se usa fuera del provider), `useUserId(): string` (lanza si no hay sesión)
  - `<RootStack />`
  - `TextField` props: `Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & { label: string; value: string; onChangeText: (value: string) => void; error?: string | null }`; por defecto `autoCapitalize="none"`, `autoCorrect={false}`.

Sin tests automáticos (componentes y contexto); verificación con typecheck, lint y `verify:bundle`.

- [ ] **Step 1: Contexto y provider de sesión**

`src/features/auth/session-context.ts`:
```ts
import type { Session } from '@supabase/supabase-js';
import { createContext } from 'react';

export interface SessionState {
  session: Session | null;
  loading: boolean;
}

/** null = fuera de SessionProvider (error de programación). */
export const SessionContext = createContext<SessionState | null>(null);
```

`src/features/auth/SessionProvider.tsx`:
```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { SessionContext, type SessionState } from './session-context';

/** Lee la sesión una sola vez y la comparte. Al cerrarse la sesión (por cualquier vía) borra la caché. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setState({ session: data.session, loading: false }))
      .catch(() => setState({ session: null, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') queryClient.clear();
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
```

`src/features/auth/hooks.ts` (reemplazar completo):
```ts
import { useContext } from 'react';
import { SessionContext, type SessionState } from './session-context';

/** Sesión actual compartida por SessionProvider. */
export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (!state) throw new Error('useSession debe usarse dentro de SessionProvider');
  return state;
}

/** Id del usuario con sesión iniciada. Solo para pantallas protegidas (detrás de Stack.Protected). */
export function useUserId(): string {
  const { session } = useSession();
  if (!session) throw new Error('No hay sesión iniciada');
  return session.user.id;
}
```

- [ ] **Step 2: Mover la navegación raíz a `RootStack`**

`src/components/RootStack.tsx`:
```tsx
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '@/features/auth/hooks';
import { colors } from '@/theme/tokens';

/** Carga fuentes, oculta el splash cuando todo está listo y protege las rutas según la sesión. */
export function RootStack() {
  const [fontsLoaded, fontError] = useFonts({ Anton_400Regular, Barlow_400Regular, Barlow_500Medium, BarlowCondensed_500Medium });
  const { session, loading } = useSession();
  const ready = (fontsLoaded || fontError !== null) && !loading;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;
  const signedIn = session !== null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.void }, animation: 'fade' }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && __DEV__}>
          <Stack.Screen name="dev/gallery" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)/login" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
```

`app/_layout.tsx` (reemplazar completo):
```tsx
import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { RootStack } from '@/components/RootStack';
import { SessionProvider } from '@/features/auth/SessionProvider';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RootStack />
      </SessionProvider>
    </QueryClientProvider>
  );
}
```
`app/(tabs)/settings.tsx` no cambia: `useSession()` conserva su firma y ahora lee el contexto (se acaba el parpadeo del correo).

- [ ] **Step 3: `TextField` con todas las props y error**

`src/components/TextField.tsx` (reemplazar completo):
```tsx
import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

type Props = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** Mensaje bajo el campo; se anuncia al lector de pantalla. */
  error?: string | null;
};

/** Campo de texto: etiqueta arriba, caja `panel` con barra roja a la izquierda cuando tiene foco. */
export function TextField({ label, error, autoCapitalize = 'none', autoCorrect = false, onFocus, onBlur, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        importantForAccessibility="no"
        style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginBottom: 6 }}
      >
        {label}
      </Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
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
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 6 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Enviar el login desde el teclado**

En `src/features/auth/components/LoginForm.tsx`, reemplazar las dos líneas de `TextField` por:
```tsx
      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={() => login.mutate()}
      />
```

- [ ] **Step 5: Verificar y commit**

Run: `bun run check` → verde. Run: `bun run verify:bundle` → `Exported`.
Run: `grep -rn "useSession\|useUserId" app src --include=*.tsx --include=*.ts` → todos los usos importan de `@/features/auth/hooks`.
```bash
git add src/features/auth app/_layout.tsx src/components/RootStack.tsx src/components/TextField.tsx
git commit -m "feat(app): share the session through a provider and accept all text input props" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Fechas robustas, `ListScreen` y `SkewRow` memorizado

**Files:**
- Modify: `src/lib/dates.ts`, `src/theme/backdrops.ts`, `src/components/Screen.tsx`, `src/components/SkewRow.tsx`
- Create: `src/components/ScreenBackdrop.tsx`, `src/components/ListScreen.tsx`
- Test: `tests/unit/src/lib/dates.test.ts` (ampliar)

**Interfaces:**
- Produces (en `@/lib/dates`, además de lo existente `LocalDate`, `toLocalDate`, `weekStart`, `formatDayLabel`):
  - `DEFAULT_TIME_ZONE = 'America/Santo_Domingo'`
  - `weekdayOf(year: number, month: number, day: number): number` (1 = lunes … 7 = domingo)
  - `localDate(year: number, month: number, day: number): LocalDate` (normaliza desbordes)
  - `minutesOfDay(instant: Date, timeZone: string): number`
  - `addDays(date: LocalDate, days: number): LocalDate`
  - `monthStart(date: LocalDate): LocalDate`, `nextMonthStart(date: LocalDate): LocalDate`
  - `isSameDate(a: LocalDate, b: LocalDate): boolean`, `toIsoDate(date: LocalDate): string` (`YYYY-MM-DD`)
  - `zonedInstant(date: LocalDate, minutesOfDay: number, timeZone: string): Date`
  - Zona inválida → se usa `DEFAULT_TIME_ZONE` (sin lanzar).
- Produces (UI): `type BackdropIndex = 0 | 1 | 2 | 3 | 4`; `<ScreenBackdrop index={BackdropIndex} />`; `Screen` props `{ title: string; backdrop: BackdropIndex; aboveTitle?: ReactNode; floating?: ReactNode; refreshControl?: ReactElement<RefreshControlProps>; children?: ReactNode }`; `ListScreen<T>` props `{ title: string; backdrop: BackdropIndex; header?: ReactNode; floating?: ReactNode } & Omit<FlatListProps<T>, 'ListHeaderComponent' | 'contentContainerStyle' | 'keyboardShouldPersistTaps'>`; `SkewRow` agrega `badge?: string` y `muted?: boolean` y se exporta envuelto en `React.memo`.

- [ ] **Step 1: Ampliar el test de fechas (falla)**

Agregar al final de `tests/unit/src/lib/dates.test.ts` (y sumar los nuevos nombres al `import` de `@/lib/dates`: `DEFAULT_TIME_ZONE, addDays, isSameDate, localDate, minutesOfDay, monthStart, nextMonthStart, toIsoDate, weekdayOf, zonedInstant`):
```ts
describe('weekdayOf / localDate', () => {
  it('derives the weekday from the calendar date', () => {
    expect(weekdayOf(2026, 10, 5)).toBe(1);
    expect(weekdayOf(2026, 10, 11)).toBe(7);
    expect(localDate(2026, 10, 6)).toEqual(d(2026, 10, 6, 2));
  });
  it('normalizes overflowing days and months', () => {
    expect(localDate(2026, 13, 1)).toEqual(d(2027, 1, 1, 5));
    expect(localDate(2026, 10, 0)).toEqual(d(2026, 9, 30, 3));
  });
});

describe('time zone handling', () => {
  it('falls back to the default zone when the zone is invalid', () => {
    const instant = new Date('2026-10-06T02:30:00Z');
    expect(toLocalDate(instant, 'Mars/Olympus')).toEqual(toLocalDate(instant, DEFAULT_TIME_ZONE));
  });
  it('reads the local minutes of the day', () => {
    expect(minutesOfDay(new Date('2026-10-06T02:30:00Z'), SD)).toBe(22 * 60 + 30);
  });
  it('builds the instant of a local date and time', () => {
    expect(zonedInstant(localDate(2026, 10, 6), 22 * 60 + 30, SD).toISOString()).toBe('2026-10-07T02:30:00.000Z');
    expect(zonedInstant(localDate(2026, 10, 5), 0, SD).toISOString()).toBe('2026-10-05T04:00:00.000Z');
  });
});

describe('calendar arithmetic', () => {
  it('adds days across months', () => {
    expect(addDays(localDate(2026, 10, 1), -1)).toEqual(d(2026, 9, 30, 3));
    expect(addDays(localDate(2026, 12, 28), 7)).toEqual(d(2027, 1, 4, 1));
  });
  it('finds month boundaries', () => {
    expect(monthStart(localDate(2026, 10, 17))).toEqual(d(2026, 10, 1, 4));
    expect(nextMonthStart(localDate(2026, 12, 15))).toEqual(d(2027, 1, 1, 5));
  });
  it('compares and serializes dates', () => {
    expect(isSameDate(localDate(2026, 10, 6), d(2026, 10, 6, 2))).toBe(true);
    expect(isSameDate(localDate(2026, 10, 6), localDate(2026, 10, 7))).toBe(false);
    expect(toIsoDate(localDate(2026, 1, 5))).toBe('2026-01-05');
  });
});
```
Run: `bun run test` → FAIL (exports inexistentes).

- [ ] **Step 2: Reescribir `src/lib/dates.ts`**

```ts
/** Fecha de calendario en una zona horaria. `weekday`: 1 = lunes … 7 = domingo. */
export interface LocalDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

export const DEFAULT_TIME_ZONE = 'America/Santo_Domingo';

const WEEKDAY_ES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const MONTH_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Un formateador por zona (crearlos es caro en Hermes). Una zona inválida usa la zona por defecto. */
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
  } catch {
    formatter = formatterFor(DEFAULT_TIME_ZONE);
  }
  formatters.set(timeZone, formatter);
  return formatter;
}

function localParts(instant: Date, timeZone: string): { year: number; month: number; day: number; minutes: number } {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? Number.NaN);
  return { year: get('year'), month: get('month'), day: get('day'), minutes: (get('hour') % 24) * 60 + get('minute') };
}

/** Día de la semana de una fecha de calendario (1 = lunes … 7 = domingo). */
export function weekdayOf(year: number, month: number, day: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function fromUtcMs(ms: number): LocalDate {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return { year, month, day, weekday: weekdayOf(year, month, day) };
}

/** Fecha de calendario; normaliza desbordes (mes 13 → enero del año siguiente, día 0 → último del mes anterior). */
export function localDate(year: number, month: number, day: number): LocalDate {
  return fromUtcMs(Date.UTC(year, month - 1, day));
}

export function toLocalDate(instant: Date, timeZone: string): LocalDate {
  const p = localParts(instant, timeZone);
  return localDate(p.year, p.month, p.day);
}

export function minutesOfDay(instant: Date, timeZone: string): number {
  return localParts(instant, timeZone).minutes;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(Date.UTC(date.year, date.month - 1, date.day) + days * DAY_MS);
}

/** Lunes de la semana de `date` (la semana empieza en lunes). */
export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, -(date.weekday - 1));
}

export function monthStart(date: LocalDate): LocalDate {
  return localDate(date.year, date.month, 1);
}

export function nextMonthStart(date: LocalDate): LocalDate {
  return localDate(date.year, date.month + 1, 1);
}

export function isSameDate(a: LocalDate, b: LocalDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function toIsoDate(date: LocalDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

/** Instante en que el reloj de `timeZone` marca `date` a los `minutesOfDay` minutos. */
export function zonedInstant(date: LocalDate, minutesOfDay: number, timeZone: string): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, 0, minutesOfDay);
  const p = localParts(new Date(guess), timeZone);
  const offset = Date.UTC(p.year, p.month - 1, p.day, 0, p.minutes) - guess;
  return new Date(guess - offset);
}

/** `MAR 06 / OCT`: etiqueta corta de día para la UI. */
export function formatDayLabel(date: LocalDate): string {
  const day = String(date.day).padStart(2, '0');
  return `${WEEKDAY_ES[date.weekday - 1]} ${day} / ${MONTH_ES[date.month - 1]}`;
}
```
Run: `bun run test` → PASS (los tests de fechas anteriores siguen en verde sin cambios).

- [ ] **Step 3: Fondo compartido y `Screen`**

En `src/theme/backdrops.ts` agregar: `export type BackdropIndex = 0 | 1 | 2 | 3 | 4;`

`src/components/ScreenBackdrop.tsx`:
```tsx
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BACKDROPS, type BackdropIndex } from '@/theme/backdrops';
import { fadeInFor, useMotionPreference } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** Forma roja de la pestaña: capa exterior con el fundido, capa interior con la rotación. */
export function ScreenBackdrop({ index }: { index: BackdropIndex }) {
  const { reduced } = useMotionPreference();
  const shape = BACKDROPS[index];
  return (
    <Animated.View
      entering={fadeInFor(reduced)}
      style={{ position: 'absolute', top: shape.top, right: shape.right, width: shape.width, height: shape.height, pointerEvents: 'none' }}
    >
      <View style={{ flex: 1, backgroundColor: colors.blood, transform: [{ rotate: `${shape.rotate}deg` }] }} />
    </Animated.View>
  );
}
```

`src/components/Screen.tsx` (reemplazar completo):
```tsx
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BackdropIndex } from '@/theme/backdrops';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';
import { ScreenBackdrop } from './ScreenBackdrop';

interface Props {
  title: string;
  backdrop: BackdropIndex;
  /** Contenido sobre el título (p. ej. la fecha de hoy en Inicio). */
  aboveTitle?: ReactNode;
  /** Elementos flotantes sobre el scroll (p. ej. el botón "+"). */
  floating?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  children?: ReactNode;
}

/** Pantalla con scroll: fondo `void`, forma roja de la pestaña, título en nota de rescate. */
export function Screen({ title, backdrop, aboveTitle, floating, refreshControl, children }: Props) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.void }}>
      <ScreenBackdrop index={backdrop} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
      >
        {aboveTitle}
        <View style={{ marginTop: 12, marginBottom: 24 }}>
          <RansomText text={title} animate />
        </View>
        {children}
      </ScrollView>
      {floating}
    </SafeAreaView>
  );
}
```

`src/components/ListScreen.tsx`:
```tsx
import type { ReactNode } from 'react';
import { FlatList, View, type FlatListProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BackdropIndex } from '@/theme/backdrops';
import { colors } from '@/theme/tokens';
import { RansomText } from './RansomText';
import { ScreenBackdrop } from './ScreenBackdrop';

type Props<T> = {
  title: string;
  backdrop: BackdropIndex;
  /** Contenido entre el título y la lista (p. ej. filtros). */
  header?: ReactNode;
  floating?: ReactNode;
} & Omit<FlatListProps<T>, 'ListHeaderComponent' | 'contentContainerStyle' | 'keyboardShouldPersistTaps'>;

/** Pantalla de lista larga: FlatList real (sin ScrollView padre), título como cabecera de la lista. */
export function ListScreen<T>({ title, backdrop, header, floating, ...list }: Props<T>) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.void }}>
      <ScreenBackdrop index={backdrop} />
      <FlatList
        {...list}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View>
            <View style={{ marginTop: 12, marginBottom: 24 }}>
              <RansomText text={title} animate />
            </View>
            {header}
          </View>
        }
      />
      {floating}
    </SafeAreaView>
  );
}
```
Los usos actuales de `<Screen backdrop={n}>` con literales 0–4 siguen compilando con `BackdropIndex`.

- [ ] **Step 4: `SkewRow` memorizado con `badge` y `muted`**

En `src/components/SkewRow.tsx`:
1. Cambiar `import { Pressable, Text, View } from 'react-native';` por `import { memo } from 'react';` + `import { Pressable, Text, View } from 'react-native';`.
2. En `Props` agregar:
```ts
  /** Etiqueta corta junto al subtítulo (p. ej. "Manual", "Ignorado"). */
  badge?: string;
  /** Atenuado: no suma (ignorado). Título y monto en `ash`. */
  muted?: boolean;
```
3. Reemplazar `export function SkewRow({ title, subtitle, amount, selected = false, onPress }: Props) {` por
`export const SkewRow = memo(function SkewRow({ title, subtitle, amount, badge, muted = false, selected = false, onPress }: Props) {`
y el `}` final de la función por `});`.
4. Reemplazar `const fg = selected ? 'void' : 'paper';` por `const fg = selected ? 'void' : muted ? 'ash' : 'paper';`
5. Agregar `badge` a la etiqueta accesible: `const label = [title, subtitle, badge, amount && moneyAccessibilityLabel(amount.value, amount.currency)]`.
6. Reemplazar el bloque `{subtitle ? (<Text …>{subtitle}</Text>) : null}` por:
```tsx
        {subtitle || badge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontFamily: fonts.body, fontSize: typeScale.caption, color: selected ? colors.void : colors.ash }}
              >
                {subtitle}
              </Text>
            ) : null}
            {badge ? (
              <Text
                style={{
                  marginLeft: subtitle ? 8 : 0,
                  paddingHorizontal: 6,
                  borderWidth: 1,
                  borderColor: selected ? colors.void : colors.ash,
                  fontFamily: fonts.bodyStrong,
                  fontSize: typeScale.caption,
                  color: selected ? colors.void : colors.ash,
                }}
              >
                {badge}
              </Text>
            ) : null}
          </View>
        ) : null}
```

- [ ] **Step 5: Verificar y commit**

Run: `bun run check` → verde. Run: `bun run verify:bundle` → `Exported`.
```bash
git add src/lib/dates.ts tests/unit/src/lib/dates.test.ts src/theme/backdrops.ts src/components/ScreenBackdrop.tsx src/components/Screen.tsx src/components/ListScreen.tsx src/components/SkewRow.tsx
git commit -m "feat(app): harden dates, add list screens and memoize skew rows" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Teclado de montos y UI genérica (chips, hojas de opciones, placeholders)

**Files:**
- Modify: `src/lib/money.ts`
- Create: `src/features/transactions/amount-input.ts`, `src/components/AmountKeypad.tsx`, `src/components/SkewChip.tsx`, `src/components/OptionSheet.tsx`, `src/components/PlaceholderRows.tsx`
- Test: `tests/unit/src/features/transactions/amount-input.test.ts`, `tests/unit/src/lib/money.test.ts` (ampliar)

**Interfaces:**
- Produces:
  - `currencySymbol(currency: Currency): string` en `@/lib/money` (`'RD$'` / `'US$'`; `formatMoney` lo reutiliza).
  - `type AmountKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace'`, `MAX_INTEGER_DIGITS = 7`
  - `pressKey(text: string, key: AmountKey): string`, `textToCents(text: string): number`, `centsToText(cents: number): string`, `formatAmountInput(text: string, currency: Currency): string`
  - `<AmountKeypad onKey={(key: AmountKey) => void} />`
  - `<SkewChip label={string} selected?: boolean onPress={() => void} />`
  - `interface Option<T extends string> { value: T; label: string }`; `<OptionSheet<T> visible title options={readonly Option<T>[]} selected={T | null} noneLabel?: string onSelect={(value: T | null) => void} onClose />`
  - `<PlaceholderRows count?: number />`

- [ ] **Step 1: Tests que fallan**

`tests/unit/src/features/transactions/amount-input.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  centsToText,
  formatAmountInput,
  pressKey,
  textToCents,
  type AmountKey,
} from '@/features/transactions/amount-input';

const press = (start: string, ...keys: AmountKey[]) => keys.reduce(pressKey, start);

describe('pressKey', () => {
  it('appends digits', () => {
    expect(press('', '2', '7', '5')).toBe('275');
  });
  it('replaces a single leading zero and never repeats zeros', () => {
    expect(press('0', '5')).toBe('5');
    expect(press('', '0', '0')).toBe('0');
  });
  it('starts decimals with "0." when the dot comes first', () => {
    expect(press('', '.')).toBe('0.');
  });
  it('accepts the dot only once', () => {
    expect(press('12.', '.')).toBe('12.');
  });
  it('allows at most two decimals', () => {
    expect(press('1.25', '9')).toBe('1.25');
  });
  it('caps the integer part at 7 digits but still allows decimals', () => {
    expect(press('9999999', '9')).toBe('9999999');
    expect(press('9999999', '.', '9', '9')).toBe('9999999.99');
  });
  it('deletes the last character', () => {
    expect(press('275.7', 'backspace')).toBe('275.');
    expect(press('', 'backspace')).toBe('');
  });
});

describe('textToCents / centsToText', () => {
  it('converts typed text to integer cents', () => {
    expect(textToCents('')).toBe(0);
    expect(textToCents('275')).toBe(27500);
    expect(textToCents('275.7')).toBe(27570);
    expect(textToCents('0.05')).toBe(5);
    expect(textToCents('0.')).toBe(0);
    expect(textToCents('9999999.99')).toBe(999999999);
  });
  it('converts cents back to editable text with two decimals', () => {
    expect(centsToText(27570)).toBe('275.70');
    expect(centsToText(5)).toBe('0.05');
    expect(centsToText(100)).toBe('1.00');
  });
});

describe('formatAmountInput', () => {
  it('shows the currency, groups thousands and keeps what was typed after the dot', () => {
    expect(formatAmountInput('', 'DOP')).toBe('RD$ 0');
    expect(formatAmountInput('1234.5', 'DOP')).toBe('RD$ 1,234.5');
    expect(formatAmountInput('1234567', 'USD')).toBe('US$ 1,234,567');
    expect(formatAmountInput('0.', 'DOP')).toBe('RD$ 0.');
  });
});
```

Agregar a `tests/unit/src/lib/money.test.ts` (y `currencySymbol` al import):
```ts
describe('currencySymbol', () => {
  it('returns the display prefix of each currency', () => {
    expect(currencySymbol('DOP')).toBe('RD$');
    expect(currencySymbol('USD')).toBe('US$');
  });
});
```
Run: `bun run test` → FAIL (módulo y export inexistentes).

- [ ] **Step 2: Implementar la lógica**

En `src/lib/money.ts`, agregar después de `const SPOKEN …`:
```ts
/** Prefijo de moneda para mostrar: `RD$` / `US$`. */
export function currencySymbol(currency: Currency): string {
  return SYMBOL[currency];
}
```
y en `formatMoney` usar `currencySymbol(currency)` en lugar de `SYMBOL[currency]`.

`src/features/transactions/amount-input.ts`:
```ts
import { currencySymbol } from '@/lib/money';
import type { Currency } from '@/types/database';

export type AmountKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace';

/** Tope: 9,999,999.99 (siete cifras enteras). */
export const MAX_INTEGER_DIGITS = 7;

/** Aplica una tecla al texto del monto. Máximo 2 decimales, un solo punto, sin ceros a la izquierda. */
export function pressKey(text: string, key: AmountKey): string {
  if (key === 'backspace') return text.slice(0, -1);
  if (key === '.') {
    if (text.includes('.')) return text;
    return text === '' ? '0.' : `${text}.`;
  }
  const [integer, decimals] = text.split('.');
  if (decimals !== undefined) return decimals.length >= 2 ? text : text + key;
  if (integer === '0') return key;
  if (integer.length >= MAX_INTEGER_DIGITS) return text;
  return text + key;
}

/** Texto del teclado → centavos enteros (sin coma flotante). */
export function textToCents(text: string): number {
  if (text === '') return 0;
  const [integer, decimals = ''] = text.split('.');
  return Number(integer || '0') * 100 + Number(`${decimals}00`.slice(0, 2));
}

/** Centavos → texto editable con dos decimales (para precargar un gasto al editarlo). */
export function centsToText(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** Monto mientras se escribe: `RD$ 1,234.5` (respeta lo escrito después del punto). */
export function formatAmountInput(text: string, currency: Currency): string {
  const [integer, decimals] = text.split('.');
  const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currencySymbol(currency)} ${grouped}${decimals !== undefined ? `.${decimals}` : ''}`;
}
```
Run: `bun run test` → PASS.

- [ ] **Step 3: Componentes genéricos**

`src/components/SkewChip.tsx`:
```tsx
import { Pressable, Text, View } from 'react-native';
import { tapFeedback } from '@/lib/haptics';
import { angles, colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

/** Chip inclinado: blanco con texto negro si está seleccionado; si no, solo borde. */
export function SkewChip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{ minHeight: MIN_TOUCH, justifyContent: 'center', marginRight: 8 }}
    >
      <View
        style={{
          transform: [{ skewX: `${angles.row}deg` }],
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderWidth: 2,
          borderColor: selected ? colors.paper : colors.ash,
          backgroundColor: selected ? colors.paper : colors.void,
        }}
      >
        <Text
          style={{
            transform: [{ skewX: `${-angles.row}deg` }],
            fontFamily: fonts.bodyStrong,
            fontSize: typeScale.caption,
            color: selected ? colors.void : colors.paper,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
```

`src/components/OptionSheet.tsx`:
```tsx
import { View } from 'react-native';
import { SkewChip } from './SkewChip';
import { SlamSheet } from './SlamSheet';

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  selected: T | null;
  /** Si se pasa, agrega una opción "ninguna" (p. ej. "Todas") que selecciona `null`. */
  noneLabel?: string;
  onSelect: (value: T | null) => void;
  onClose: () => void;
}

/** Hoja para elegir una opción entre chips; se cierra al elegir. */
export function OptionSheet<T extends string>({ visible, title, options, selected, noneLabel, onSelect, onClose }: Props<T>) {
  const choose = (value: T | null) => {
    onSelect(value);
    onClose();
  };
  return (
    <SlamSheet visible={visible} onClose={onClose} title={title}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {noneLabel ? <SkewChip label={noneLabel} selected={selected === null} onPress={() => choose(null)} /> : null}
        {options.map((option) => (
          <SkewChip key={option.value} label={option.label} selected={selected === option.value} onPress={() => choose(option.value)} />
        ))}
      </View>
    </SlamSheet>
  );
}
```

`src/components/AmountKeypad.tsx`:
```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { AmountKey } from '@/features/transactions/amount-input';
import { tapFeedback } from '@/lib/haptics';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

const ROWS: readonly (readonly AmountKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

const KEY_HEIGHT = 52;

function keyLabel(key: AmountKey): string {
  if (key === '.') return 'Punto decimal';
  if (key === 'backspace') return 'Borrar';
  return key;
}

/** Teclado numérico propio: teclas inclinadas que vibran al tocarlas. */
export function AmountKeypad({ onKey }: { onKey: (key: AmountKey) => void }) {
  return (
    <View style={{ marginTop: 8 }}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={{ flexDirection: 'row' }}>
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={keyLabel(key)}
              onPress={() => {
                tapFeedback();
                onKey(key);
              }}
              style={{ flex: 1, height: KEY_HEIGHT, margin: 3 }}
            >
              <View
                style={{
                  flex: 1,
                  transform: [{ skewX: `${angles.row}deg` }],
                  backgroundColor: key === 'backspace' ? colors.void : colors.panel,
                  borderWidth: key === 'backspace' ? 2 : 0,
                  borderColor: colors.ash,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ transform: [{ skewX: `${-angles.row}deg` }] }}>
                  {key === 'backspace' ? (
                    <Ionicons name="backspace-outline" size={24} color={colors.paper} />
                  ) : (
                    <Text style={{ fontFamily: fonts.amount, fontSize: typeScale.displayMd, color: colors.paper }}>{key}</Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
```

`src/components/PlaceholderRows.tsx`:
```tsx
import { View } from 'react-native';
import { angles, colors, MIN_TOUCH } from '@/theme/tokens';

/** Tiras vacías con forma de fila mientras cargan los datos (sin spinners genéricos). */
export function PlaceholderRows({ count = 3 }: { count?: number }) {
  return (
    <View accessible accessibilityLabel="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{ height: MIN_TOUCH, marginVertical: 3, backgroundColor: colors.panel, transform: [{ skewX: `${angles.row}deg` }] }}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Verificar y commit**

Run: `bun run check` → verde (sin warnings de lint en los archivos nuevos).
```bash
git add src/lib/money.ts tests/unit/src/lib/money.test.ts src/features/transactions/amount-input.ts tests/unit/src/features/transactions/amount-input.test.ts src/components/AmountKeypad.tsx src/components/SkewChip.tsx src/components/OptionSheet.tsx src/components/PlaceholderRows.tsx
git commit -m "feat(app): add amount keypad logic, skew chips, option sheets and placeholders" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Lógica pura de dominio (filtros, agrupación, filas, fechas de gasto, comparaciones, categorías, presupuestos)

**Files:**
- Modify: `src/types/database.ts`
- Create: `src/features/transactions/filters.ts`, `src/features/transactions/grouping.ts`, `src/features/transactions/mapping.ts`, `src/features/transactions/expense-date.ts`, `src/features/summary/comparison.ts`, `src/features/summary/mapping.ts`, `src/features/categories/recent.ts`, `src/features/budgets/active.ts`
- Test: `tests/unit/src/features/transactions/{filters,grouping,mapping,expense-date}.test.ts`, `tests/unit/src/features/summary/{comparison,mapping}.test.ts`, `tests/unit/src/features/categories/recent.test.ts`, `tests/unit/src/features/budgets/active.test.ts`

**Interfaces:**
- Consumes: `@/lib/dates` (Task 2: `toLocalDate`, `weekStart`, `monthStart`, `nextMonthStart`, `addDays`, `isSameDate`, `toIsoDate`, `minutesOfDay`, `zonedInstant`, `formatDayLabel`, `LocalDate`); `formatMoney` (`@/lib/money`).
- Produces:
  - `@/types/database`: `BankCode = Enums<'bank_code'>`, `BudgetPeriod = Enums<'budget_period'>`, `TxSource = Enums<'tx_source'>`.
  - `filters.ts`: `type Period = 'week' | 'month' | 'all'`; `interface TransactionFilters { period: Period; categoryId: string | null; currency: Currency | null; bankCode: BankCode | null; review: boolean }`; `DEFAULT_FILTERS`; `PERIOD_LABELS`, `BANK_LABELS`, `CURRENCY_LABELS`; `interface DateRange { from: string | null; to: string | null }`; `periodRange(period: Period, now: Date, timeZone: string): DateRange`.
  - `mapping.ts`: `type TransactionRow`; `interface TransactionListItem { id; amount: number; currency: Currency; merchant: string | null; occurredAt: string; categoryId: string | null; categoryName: string | null; isIgnored: boolean; source: TxSource; bankCode: BankCode | null }`; `toListItem(row: TransactionRow): TransactionListItem`; `interface RowPresentation { title: string; subtitle: string; badge?: string; muted: boolean }`; `presentRow(item: TransactionListItem): RowPresentation`.
  - `grouping.ts`: `type ListEntry<T> = { kind: 'header'; key: string; title: string } | { kind: 'row'; key: string; item: T }`; `groupByDay<T extends { id: string; occurredAt: string }>(items: readonly T[], now: Date, timeZone: string): ListEntry<T>[]`.
  - `expense-date.ts`: `type DateChoice = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'other'; date: LocalDate }`; `occurredAtFor(choice: DateChoice, now: Date, timeZone: string): string`.
  - `summary/comparison.ts`: `comparisonText(current: number, previous: number, period: BudgetPeriod): string`.
  - `summary/mapping.ts`: `interface SpendingSummary { totalDop: number; previousTotalDop: number; txCount: number }`; `toSpendingSummary(row: { total_dop: number; previous_total_dop: number; tx_count: number } | undefined): SpendingSummary`.
  - `categories/recent.ts`: `interface CategoryOption { id: string; name: string }`; `pickRecentCategories(recentIds: readonly (string | null)[], all: readonly CategoryOption[], count?: number): CategoryOption[]`.
  - `budgets/active.ts`: `interface ActiveBudgets { week: number | null; month: number | null }`; `toActiveBudgets(rows: readonly { period: BudgetPeriod; limit_amount: number }[]): ActiveBudgets`.

- [ ] **Step 1: Tipos de enums**

En `src/types/database.ts` agregar al final:
```ts
export type BankCode = Enums<'bank_code'>;
export type BudgetPeriod = Enums<'budget_period'>;
export type TxSource = Enums<'tx_source'>;
```

- [ ] **Step 2: Tests que fallan**

`tests/unit/src/features/transactions/filters.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, periodRange } from '@/features/transactions/filters';

const SD = 'America/Santo_Domingo';

describe('periodRange', () => {
  // martes 6 de octubre de 2026, 11:00 en Santo Domingo
  const now = new Date('2026-10-06T15:00:00Z');

  it('covers Monday 00:00 to next Monday 00:00 in the profile zone for "week"', () => {
    expect(periodRange('week', now, SD)).toEqual({ from: '2026-10-05T04:00:00.000Z', to: '2026-10-12T04:00:00.000Z' });
  });
  it('covers the first day of the month to the first of the next for "month"', () => {
    expect(periodRange('month', now, SD)).toEqual({ from: '2026-10-01T04:00:00.000Z', to: '2026-11-01T04:00:00.000Z' });
  });
  it('crosses the year boundary', () => {
    // 31 de diciembre, 19:00 en Santo Domingo
    expect(periodRange('month', new Date('2026-12-31T23:00:00Z'), SD)).toEqual({
      from: '2026-12-01T04:00:00.000Z',
      to: '2027-01-01T04:00:00.000Z',
    });
  });
  it('has no bounds for "all"', () => {
    expect(periodRange('all', now, SD)).toEqual({ from: null, to: null });
  });
  it('defaults to this month with no other filter', () => {
    expect(DEFAULT_FILTERS).toEqual({ period: 'month', categoryId: null, currency: null, bankCode: null, review: false });
  });
});
```

`tests/unit/src/features/transactions/grouping.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { groupByDay } from '@/features/transactions/grouping';

const SD = 'America/Santo_Domingo';
// martes 6 de octubre, 22:30 en Santo Domingo
const now = new Date('2026-10-07T02:30:00Z');
const item = (id: string, occurredAt: string) => ({ id, occurredAt });

describe('groupByDay', () => {
  it('inserts a header before each local day, naming today and yesterday', () => {
    const items = [
      item('a', '2026-10-07T01:00:00Z'), // mar 6, 21:00 → HOY
      item('b', '2026-10-06T04:30:00Z'), // mar 6, 00:30 → HOY
      item('c', '2026-10-06T03:59:00Z'), // lun 5, 23:59 → AYER
      item('d', '2026-10-01T15:00:00Z'), // jue 1, 11:00
    ];
    expect(groupByDay(items, now, SD)).toEqual([
      { kind: 'header', key: 'day-2026-10-06', title: 'HOY' },
      { kind: 'row', key: 'a', item: items[0] },
      { kind: 'row', key: 'b', item: items[1] },
      { kind: 'header', key: 'day-2026-10-05', title: 'AYER' },
      { kind: 'row', key: 'c', item: items[2] },
      { kind: 'header', key: 'day-2026-10-01', title: 'JUE 01 / OCT' },
      { kind: 'row', key: 'd', item: items[3] },
    ]);
  });
  it('returns an empty list for no items', () => {
    expect(groupByDay([], now, SD)).toEqual([]);
  });
});
```

`tests/unit/src/features/transactions/mapping.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { presentRow, toListItem, type TransactionListItem } from '@/features/transactions/mapping';

const row = {
  id: 't1',
  amount: 275.72,
  currency: 'DOP' as const,
  merchant: 'UBER*RIDES',
  occurred_at: '2026-10-06T02:42:00+00:00',
  category_id: 'c1',
  is_ignored: false,
  source: 'email' as const,
  bank_code: 'bhd' as const,
  categories: { name: 'Transporte' },
};

const item = (overrides: Partial<TransactionListItem> = {}): TransactionListItem => ({ ...toListItem(row), ...overrides });

describe('toListItem', () => {
  it('maps the database row to the list item', () => {
    expect(toListItem(row)).toEqual({
      id: 't1',
      amount: 275.72,
      currency: 'DOP',
      merchant: 'UBER*RIDES',
      occurredAt: '2026-10-06T02:42:00+00:00',
      categoryId: 'c1',
      categoryName: 'Transporte',
      isIgnored: false,
      source: 'email',
      bankCode: 'bhd',
    });
  });
  it('handles a row without category', () => {
    expect(toListItem({ ...row, category_id: null, categories: null }).categoryName).toBeNull();
  });
});

describe('presentRow', () => {
  it('uses merchant and category', () => {
    expect(presentRow(item())).toEqual({ title: 'UBER*RIDES', subtitle: 'Transporte', badge: undefined, muted: false });
  });
  it('falls back when merchant or category are missing', () => {
    expect(presentRow(item({ merchant: '  ', categoryName: null }))).toMatchObject({
      title: 'Sin descripción',
      subtitle: 'Sin categoría',
    });
  });
  it('marks manual expenses', () => {
    expect(presentRow(item({ source: 'manual' })).badge).toBe('Manual');
  });
  it('mutes ignored transactions and says so (takes precedence over Manual)', () => {
    expect(presentRow(item({ source: 'manual', isIgnored: true }))).toMatchObject({ badge: 'Ignorado', muted: true });
  });
});
```

`tests/unit/src/features/transactions/expense-date.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { occurredAtFor } from '@/features/transactions/expense-date';
import { localDate } from '@/lib/dates';

const SD = 'America/Santo_Domingo';
// martes 6 de octubre, 22:30 en Santo Domingo (ya es 7 en UTC)
const now = new Date('2026-10-07T02:30:00Z');

describe('occurredAtFor', () => {
  it('uses the current instant for "today"', () => {
    expect(occurredAtFor({ kind: 'today' }, now, SD)).toBe('2026-10-07T02:30:00.000Z');
  });
  it('uses yesterday in the profile zone at the current local time', () => {
    expect(occurredAtFor({ kind: 'yesterday' }, now, SD)).toBe('2026-10-06T02:30:00.000Z');
  });
  it('uses the chosen local date at the current local time', () => {
    expect(occurredAtFor({ kind: 'other', date: localDate(2026, 10, 1) }, now, SD)).toBe('2026-10-02T02:30:00.000Z');
  });
});
```

`tests/unit/src/features/summary/comparison.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { comparisonText } from '@/features/summary/comparison';

describe('comparisonText', () => {
  it('says how much more than the previous week', () => {
    expect(comparisonText(4275.72, 3663.42, 'week')).toBe('RD$ 612.30 más que la semana pasada');
  });
  it('says how much less than the previous month', () => {
    expect(comparisonText(100, 240, 'month')).toBe('RD$ 140.00 menos que el mes pasado');
  });
  it('says equal when there is no difference, ignoring float noise', () => {
    expect(comparisonText(50.1, 50.1, 'week')).toBe('Igual que la semana pasada');
    expect(comparisonText(0.3, 0.1 + 0.2, 'month')).toBe('Igual que el mes pasado');
  });
});
```

`tests/unit/src/features/summary/mapping.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { toSpendingSummary } from '@/features/summary/mapping';

describe('toSpendingSummary', () => {
  it('maps the RPC row', () => {
    expect(toSpendingSummary({ total_dop: 1045.72, previous_total_dop: 100, tx_count: 3 })).toEqual({
      totalDop: 1045.72,
      previousTotalDop: 100,
      txCount: 3,
    });
  });
  it('returns zeros when the RPC returns no row', () => {
    expect(toSpendingSummary(undefined)).toEqual({ totalDop: 0, previousTotalDop: 0, txCount: 0 });
  });
});
```

`tests/unit/src/features/categories/recent.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { pickRecentCategories } from '@/features/categories/recent';

const all = [
  { id: 'a', name: 'Comida' },
  { id: 'b', name: 'Hogar' },
  { id: 'c', name: 'Salud' },
  { id: 'd', name: 'Transporte' },
];

describe('pickRecentCategories', () => {
  it('keeps the order of most recent use without repeats', () => {
    expect(pickRecentCategories(['d', 'd', 'a', 'c', 'b'], all)).toEqual([all[3], all[0], all[2]]);
  });
  it('skips nulls and unknown ids, then fills with the first by name', () => {
    expect(pickRecentCategories([null, 'zzz', 'c'], all)).toEqual([all[2], all[0], all[1]]);
  });
  it('returns the first by name when there is no history', () => {
    expect(pickRecentCategories([], all, 2)).toEqual([all[0], all[1]]);
  });
});
```

`tests/unit/src/features/budgets/active.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { toActiveBudgets } from '@/features/budgets/active';

describe('toActiveBudgets', () => {
  it('maps the active week and month limits', () => {
    expect(
      toActiveBudgets([
        { period: 'week', limit_amount: 6000 },
        { period: 'month', limit_amount: 25000 },
      ]),
    ).toEqual({ week: 6000, month: 25000 });
  });
  it('returns null for a period without an active budget', () => {
    expect(toActiveBudgets([{ period: 'month', limit_amount: 25000 }])).toEqual({ week: null, month: 25000 });
  });
});
```
Run: `bun run test` → FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

`src/features/transactions/filters.ts`:
```ts
import { addDays, monthStart, nextMonthStart, toLocalDate, weekStart, zonedInstant } from '@/lib/dates';
import type { BankCode, Currency } from '@/types/database';

export type Period = 'week' | 'month' | 'all';

export interface TransactionFilters {
  period: Period;
  categoryId: string | null;
  currency: Currency | null;
  bankCode: BankCode | null;
  /** Solo reversas sin emparejar (las que el usuario debe revisar). */
  review: boolean;
}

export const DEFAULT_FILTERS: TransactionFilters = { period: 'month', categoryId: null, currency: null, bankCode: null, review: false };

export const PERIOD_LABELS: Record<Period, string> = { week: 'Esta semana', month: 'Este mes', all: 'Todo' };
export const BANK_LABELS: Record<BankCode, string> = { bhd: 'BHD', banreservas: 'Banreservas', popular: 'Popular', apap: 'APAP' };
export const CURRENCY_LABELS: Record<Currency, string> = { DOP: 'RD$', USD: 'US$' };

export interface DateRange {
  from: string | null;
  /** Exclusivo. */
  to: string | null;
}

/** Rango del período en la zona del perfil, con las mismas reglas que las RPC (semana desde el lunes). */
export function periodRange(period: Period, now: Date, timeZone: string): DateRange {
  if (period === 'all') return { from: null, to: null };
  const today = toLocalDate(now, timeZone);
  const start = period === 'week' ? weekStart(today) : monthStart(today);
  const end = period === 'week' ? addDays(start, 7) : nextMonthStart(today);
  return { from: zonedInstant(start, 0, timeZone).toISOString(), to: zonedInstant(end, 0, timeZone).toISOString() };
}
```

`src/features/transactions/mapping.ts`:
```ts
import type { BankCode, Currency, Tables, TxSource } from '@/types/database';

/** Fila tal como la devuelve la consulta de la lista (con el nombre de la categoría embebido). */
export type TransactionRow = Pick<
  Tables<'transactions'>,
  'id' | 'amount' | 'currency' | 'merchant' | 'occurred_at' | 'category_id' | 'is_ignored' | 'source' | 'bank_code'
> & { categories: { name: string } | null };

export interface TransactionListItem {
  id: string;
  amount: number;
  currency: Currency;
  merchant: string | null;
  occurredAt: string;
  categoryId: string | null;
  categoryName: string | null;
  isIgnored: boolean;
  source: TxSource;
  bankCode: BankCode | null;
}

export function toListItem(row: TransactionRow): TransactionListItem {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    merchant: row.merchant,
    occurredAt: row.occurred_at,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    isIgnored: row.is_ignored,
    source: row.source,
    bankCode: row.bank_code,
  };
}

export interface RowPresentation {
  title: string;
  subtitle: string;
  badge?: string;
  muted: boolean;
}

/** Textos de la fila: comercio, categoría y una marca ("Ignorado" manda sobre "Manual"). */
export function presentRow(item: TransactionListItem): RowPresentation {
  return {
    title: item.merchant?.trim() || 'Sin descripción',
    subtitle: item.categoryName ?? 'Sin categoría',
    badge: item.isIgnored ? 'Ignorado' : item.source === 'manual' ? 'Manual' : undefined,
    muted: item.isIgnored,
  };
}
```

`src/features/transactions/grouping.ts`:
```ts
import { addDays, formatDayLabel, isSameDate, toIsoDate, toLocalDate } from '@/lib/dates';

export type ListEntry<T> = { kind: 'header'; key: string; title: string } | { kind: 'row'; key: string; item: T };

/** Inserta un encabezado antes de cada día local ("HOY", "AYER" o `MAR 06 / OCT`). Respeta el orden recibido. */
export function groupByDay<T extends { id: string; occurredAt: string }>(
  items: readonly T[],
  now: Date,
  timeZone: string,
): ListEntry<T>[] {
  const today = toLocalDate(now, timeZone);
  const yesterday = addDays(today, -1);
  const entries: ListEntry<T>[] = [];
  let currentDay = '';
  for (const item of items) {
    const date = toLocalDate(new Date(item.occurredAt), timeZone);
    const day = toIsoDate(date);
    if (day !== currentDay) {
      currentDay = day;
      const title = isSameDate(date, today) ? 'HOY' : isSameDate(date, yesterday) ? 'AYER' : formatDayLabel(date);
      entries.push({ kind: 'header', key: `day-${day}`, title });
    }
    entries.push({ kind: 'row', key: item.id, item });
  }
  return entries;
}
```

`src/features/transactions/expense-date.ts`:
```ts
import { addDays, minutesOfDay, toLocalDate, zonedInstant, type LocalDate } from '@/lib/dates';

export type DateChoice = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'other'; date: LocalDate };

/** Momento a guardar para un gasto manual: el día elegido a la hora local actual, en la zona del perfil. */
export function occurredAtFor(choice: DateChoice, now: Date, timeZone: string): string {
  if (choice.kind === 'today') return now.toISOString();
  const date = choice.kind === 'yesterday' ? addDays(toLocalDate(now, timeZone), -1) : choice.date;
  return zonedInstant(date, minutesOfDay(now, timeZone), timeZone).toISOString();
}
```

`src/features/summary/comparison.ts`:
```ts
import { formatMoney } from '@/lib/money';
import type { BudgetPeriod } from '@/types/database';

const PREVIOUS: Record<BudgetPeriod, string> = { week: 'la semana pasada', month: 'el mes pasado' };

/** "RD$ 612.30 más que la semana pasada". Neutro: ni celebra gastar menos ni castiga gastar más. */
export function comparisonText(current: number, previous: number, period: BudgetPeriod): string {
  const diffCents = Math.round(current * 100) - Math.round(previous * 100);
  if (diffCents === 0) return `Igual que ${PREVIOUS[period]}`;
  const amount = formatMoney(Math.abs(diffCents) / 100, 'DOP');
  return `${amount} ${diffCents > 0 ? 'más' : 'menos'} que ${PREVIOUS[period]}`;
}
```

`src/features/summary/mapping.ts`:
```ts
export interface SpendingSummary {
  totalDop: number;
  previousTotalDop: number;
  txCount: number;
}

export function toSpendingSummary(
  row: { total_dop: number; previous_total_dop: number; tx_count: number } | undefined,
): SpendingSummary {
  if (!row) return { totalDop: 0, previousTotalDop: 0, txCount: 0 };
  return { totalDop: row.total_dop, previousTotalDop: row.previous_total_dop, txCount: row.tx_count };
}
```

`src/features/categories/recent.ts`:
```ts
export interface CategoryOption {
  id: string;
  name: string;
}

/** Categorías usadas más recientemente (sin repetir); si faltan, completa con las primeras de `all`. */
export function pickRecentCategories(
  recentIds: readonly (string | null)[],
  all: readonly CategoryOption[],
  count = 3,
): CategoryOption[] {
  const byId = new Map(all.map((category) => [category.id, category]));
  const picked: CategoryOption[] = [];
  for (const id of recentIds) {
    if (picked.length === count) return picked;
    const category = id ? byId.get(id) : undefined;
    if (category && !picked.includes(category)) picked.push(category);
  }
  for (const category of all) {
    if (picked.length === count) break;
    if (!picked.includes(category)) picked.push(category);
  }
  return picked;
}
```

`src/features/budgets/active.ts`:
```ts
import type { BudgetPeriod } from '@/types/database';

export interface ActiveBudgets {
  week: number | null;
  month: number | null;
}

export function toActiveBudgets(rows: readonly { period: BudgetPeriod; limit_amount: number }[]): ActiveBudgets {
  const limitOf = (period: BudgetPeriod) => rows.find((row) => row.period === period)?.limit_amount ?? null;
  return { week: limitOf('week'), month: limitOf('month') };
}
```
Run: `bun run test` → PASS.

- [ ] **Step 4: Check y commit**

Run: `bun run check` → verde.
```bash
git add src/types/database.ts src/features/transactions/filters.ts src/features/transactions/grouping.ts src/features/transactions/mapping.ts src/features/transactions/expense-date.ts src/features/summary src/features/categories/recent.ts src/features/budgets/active.ts tests/unit/src/features
git commit -m "feat(app): add pure logic for filters, day grouping, rows, expense dates and summaries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Acceso a datos (keys, api, hooks)

**Files:**
- Create: `src/features/transactions/{keys,api,hooks}.ts`, `src/features/summary/{keys,api,hooks}.ts`, `src/features/categories/{keys,api,hooks}.ts`, `src/features/budgets/{keys,api,hooks}.ts`, `src/features/profile/{keys,api,hooks}.ts`

**Interfaces:**
- Consumes: `supabase` (`@/lib/supabase`), `useUserId` (Task 1), `DEFAULT_TIME_ZONE` (Task 2), todo lo de Task 4.
- Produces:
  - `profile`: `interface Profile { primaryCurrency: Currency; timeZone: string }`; `useProfile()`; `useTimeZone(): string` (zona del perfil o `DEFAULT_TIME_ZONE`).
  - `transactions`: `PAGE_SIZE = 50`; `interface TransactionPage { items: TransactionListItem[]; count: number }`; `interface NewExpense { amountCents: number; currency: Currency; merchant: string; categoryId: string | null; occurredAt: string }`; `interface ExpenseChanges { amountCents: number; merchant: string; categoryId: string | null; currency?: Currency; occurredAt?: string }`; hooks `useTransactionList(filters: TransactionFilters)` (infinite), `useRecentTransactions()`, `useCreateExpense()` (variables `NewExpense`), `useUpdateExpense()` (variables `{ id: string; changes: ExpenseChanges }`), `useSetIgnored()` (variables `{ id: string; ignored: boolean }`), `useDeleteExpense()` (variables `string` id).
  - `summary`: `useSpendingSummary(period: BudgetPeriod)` → `SpendingSummary`.
  - `categories`: `useCategories()` → `CategoryOption[]`; `useRecentCategories()` → `CategoryOption[]` (3).
  - `budgets`: `useActiveBudgets()` → `ActiveBudgets`.
  - keys: `transactionKeys`, `summaryKeys`, `categoryKeys`, `budgetKeys`, `profileKeys` (ver código).

Sin tests nuevos: las transformaciones ya están testeadas en Task 4; aquí solo hay llamadas a Supabase y hooks. Verificación con typecheck y lint.

- [ ] **Step 1: Keys**

`src/features/profile/keys.ts`:
```ts
export const profileKeys = {
  all: ['profile'] as const,
  me: (userId: string) => ['profile', userId] as const,
};
```
`src/features/transactions/keys.ts`:
```ts
import type { TransactionFilters } from './filters';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
  recent: () => ['transactions', 'recent'] as const,
};
```
`src/features/summary/keys.ts`:
```ts
import type { BudgetPeriod } from '@/types/database';

export const summaryKeys = {
  all: ['summary'] as const,
  period: (period: BudgetPeriod) => ['summary', period] as const,
};
```
`src/features/categories/keys.ts`:
```ts
export const categoryKeys = {
  all: ['categories'] as const,
  list: () => ['categories', 'list'] as const,
  recent: () => ['categories', 'recent'] as const,
};
```
`src/features/budgets/keys.ts`:
```ts
export const budgetKeys = {
  all: ['budgets'] as const,
  active: () => ['budgets', 'active'] as const,
};
```

- [ ] **Step 2: API**

`src/features/profile/api.ts`:
```ts
import { supabase } from '@/lib/supabase';
import type { Currency } from '@/types/database';

export interface Profile {
  primaryCurrency: Currency;
  timeZone: string;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('primary_currency, timezone').eq('user_id', userId).single();
  if (error) throw error;
  return { primaryCurrency: data.primary_currency, timeZone: data.timezone };
}
```

`src/features/transactions/api.ts`:
```ts
import { supabase } from '@/lib/supabase';
import type { Currency } from '@/types/database';
import { periodRange, type TransactionFilters } from './filters';
import { toListItem, type TransactionListItem, type TransactionRow } from './mapping';

export const PAGE_SIZE = 50;

const LIST_COLUMNS = 'id, amount, currency, merchant, occurred_at, category_id, is_ignored, source, bank_code, categories(name)';

export interface TransactionPage {
  items: TransactionListItem[];
  count: number;
}

export async function fetchTransactionPage(
  filters: TransactionFilters,
  page: number,
  now: Date,
  timeZone: string,
): Promise<TransactionPage> {
  const range = periodRange(filters.period, now, timeZone);
  let query = supabase.from('transactions').select(LIST_COLUMNS, { count: 'exact' });
  if (range.from) query = query.gte('occurred_at', range.from);
  if (range.to) query = query.lt('occurred_at', range.to);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.currency) query = query.eq('currency', filters.currency);
  if (filters.bankCode) query = query.eq('bank_code', filters.bankCode);
  if (filters.review) query = query.eq('ignored_reason', 'unmatched_reversal');
  const from = page * PAGE_SIZE;
  const { data, error, count } = await query
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data as TransactionRow[]).map(toListItem), count: count ?? 0 };
}

export async function fetchRecentTransactions(limit: number): Promise<TransactionListItem[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(LIST_COLUMNS)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as TransactionRow[]).map(toListItem);
}

export interface NewExpense {
  amountCents: number;
  currency: Currency;
  merchant: string;
  categoryId: string | null;
  occurredAt: string;
}

export async function createExpense(expense: NewExpense, userId: string): Promise<void> {
  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    source: 'manual',
    type: 'card_purchase',
    amount: expense.amountCents / 100,
    currency: expense.currency,
    merchant: expense.merchant.trim() || null,
    category_id: expense.categoryId,
    occurred_at: expense.occurredAt,
  });
  if (error) throw error;
}

export interface ExpenseChanges {
  amountCents: number;
  merchant: string;
  categoryId: string | null;
  /** Solo gastos manuales: la moneda y la fecha de un importado son datos del banco. */
  currency?: Currency;
  occurredAt?: string;
}

export async function updateExpense(id: string, changes: ExpenseChanges): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({
      amount: changes.amountCents / 100,
      merchant: changes.merchant.trim() || null,
      category_id: changes.categoryId,
      ...(changes.currency ? { currency: changes.currency } : {}),
      ...(changes.occurredAt ? { occurred_at: changes.occurredAt } : {}),
    })
    .eq('id', id);
  if (error) throw error;
}

/** `is_ignored` e `ignored_reason` siempre juntos (CHECK `transactions_ignored_reason_shape`). */
export async function setIgnored(id: string, ignored: boolean): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ is_ignored: ignored, ignored_reason: ignored ? 'user' : null })
    .eq('id', id);
  if (error) throw error;
}

/** Solo borra gastos manuales (la política RLS ya lo impide para los de correo). */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('source', 'manual');
  if (error) throw error;
}
```
Si el tipo inferido por supabase-js para `data` ya coincide con `TransactionRow[]`, el `as` es inofensivo; si no compila, reportarlo (no cambiar el diseño).

`src/features/summary/api.ts`:
```ts
import { supabase } from '@/lib/supabase';
import type { BudgetPeriod } from '@/types/database';
import { toSpendingSummary, type SpendingSummary } from './mapping';

/** Totales del período actual y del anterior, en DOP, calculados por la RPC (nunca en el cliente). */
export async function fetchSpendingSummary(period: BudgetPeriod): Promise<SpendingSummary> {
  const { data, error } = await supabase.rpc('get_spending_summary', { p_period: period });
  if (error) throw error;
  return toSpendingSummary(data?.[0]);
}
```

`src/features/categories/api.ts`:
```ts
import { supabase } from '@/lib/supabase';
import type { CategoryOption } from './recent';

export async function fetchCategories(): Promise<CategoryOption[]> {
  const { data, error } = await supabase.from('categories').select('id, name').order('name');
  if (error) throw error;
  return data;
}

/** Categorías de los últimos 30 movimientos, del más reciente al más viejo (selección, no agregado). */
export async function fetchRecentCategoryIds(): Promise<(string | null)[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('category_id')
    .not('category_id', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data.map((row) => row.category_id);
}
```

`src/features/budgets/api.ts`:
```ts
import { supabase } from '@/lib/supabase';
import { toActiveBudgets, type ActiveBudgets } from './active';

export async function fetchActiveBudgets(): Promise<ActiveBudgets> {
  const { data, error } = await supabase.from('budgets').select('period, limit_amount').eq('is_active', true);
  if (error) throw error;
  return toActiveBudgets(data);
}
```

- [ ] **Step 3: Hooks**

`src/features/profile/hooks.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { useUserId } from '@/features/auth/hooks';
import { DEFAULT_TIME_ZONE } from '@/lib/dates';
import { fetchProfile } from './api';
import { profileKeys } from './keys';

export function useProfile() {
  const userId = useUserId();
  return useQuery({ queryKey: profileKeys.me(userId), queryFn: () => fetchProfile(userId), staleTime: 5 * 60_000 });
}

/** Zona horaria del perfil (o la por defecto mientras carga). */
export function useTimeZone(): string {
  return useProfile().data?.timeZone ?? DEFAULT_TIME_ZONE;
}
```

`src/features/transactions/hooks.ts`:
```ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { categoryKeys } from '@/features/categories/keys';
import { useUserId } from '@/features/auth/hooks';
import { useTimeZone } from '@/features/profile/hooks';
import { summaryKeys } from '@/features/summary/keys';
import {
  createExpense,
  deleteExpense,
  fetchRecentTransactions,
  fetchTransactionPage,
  PAGE_SIZE,
  setIgnored,
  updateExpense,
  type ExpenseChanges,
  type NewExpense,
} from './api';
import type { TransactionFilters } from './filters';
import { transactionKeys } from './keys';

const RECENT_COUNT = 5;

/** Todo lo que depende de los movimientos: lista, totales y categorías recientes. */
function invalidateSpending(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
    queryClient.invalidateQueries({ queryKey: summaryKeys.all }),
    queryClient.invalidateQueries({ queryKey: categoryKeys.recent() }),
  ]);
}

export function useTransactionList(filters: TransactionFilters) {
  const timeZone = useTimeZone();
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ pageParam }) => fetchTransactionPage(filters, pageParam, new Date(), timeZone),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (pages.length * PAGE_SIZE < last.count ? pages.length : undefined),
  });
}

export function useRecentTransactions() {
  return useQuery({ queryKey: transactionKeys.recent(), queryFn: () => fetchRecentTransactions(RECENT_COUNT) });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (expense: NewExpense) => createExpense(expense, userId),
    onSuccess: () => invalidateSpending(queryClient),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ExpenseChanges }) => updateExpense(id, changes),
    onSuccess: () => invalidateSpending(queryClient),
  });
}

export function useSetIgnored() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ignored }: { id: string; ignored: boolean }) => setIgnored(id, ignored),
    onSuccess: () => invalidateSpending(queryClient),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => invalidateSpending(queryClient),
  });
}
```

`src/features/summary/hooks.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import type { BudgetPeriod } from '@/types/database';
import { fetchSpendingSummary } from './api';
import { summaryKeys } from './keys';

export function useSpendingSummary(period: BudgetPeriod) {
  return useQuery({ queryKey: summaryKeys.period(period), queryFn: () => fetchSpendingSummary(period) });
}
```

`src/features/categories/hooks.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchCategories, fetchRecentCategoryIds } from './api';
import { categoryKeys } from './keys';
import { pickRecentCategories, type CategoryOption } from './recent';

export function useCategories() {
  return useQuery({ queryKey: categoryKeys.list(), queryFn: fetchCategories, staleTime: 5 * 60_000 });
}

/** Las 3 categorías usadas más recientemente (completa con las primeras por nombre). */
export function useRecentCategories(): CategoryOption[] {
  const categories = useCategories();
  const recentIds = useQuery({ queryKey: categoryKeys.recent(), queryFn: fetchRecentCategoryIds });
  return useMemo(
    () => pickRecentCategories(recentIds.data ?? [], categories.data ?? []),
    [recentIds.data, categories.data],
  );
}
```

`src/features/budgets/hooks.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { fetchActiveBudgets } from './api';
import { budgetKeys } from './keys';

export function useActiveBudgets() {
  return useQuery({ queryKey: budgetKeys.active(), queryFn: fetchActiveBudgets });
}
```

- [ ] **Step 4: Verificar y commit**

Run: `bun run check` → verde.
```bash
git add src/features/transactions/keys.ts src/features/transactions/api.ts src/features/transactions/hooks.ts src/features/summary/keys.ts src/features/summary/api.ts src/features/summary/hooks.ts src/features/categories/keys.ts src/features/categories/api.ts src/features/categories/hooks.ts src/features/budgets/keys.ts src/features/budgets/api.ts src/features/budgets/hooks.ts src/features/profile
git commit -m "feat(app): add data access for transactions, summaries, categories, budgets and profile" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

> **PLAN INCOMPLETO (2026-10-06):** faltan por escribir la Task 6 (ExpenseSheet/ExpenseForm + AddFab + datetimepicker), la Task 7 (Movimientos: TransactionsScreen, FilterBar, DayHeader, TransactionRow), la Task 8 (Inicio: HomeScreen, SummaryBlock, DayTag, RecentTransactions) y la Task 9 (CLAUDE.md, roadmap, checklist 2026-10-06-plan-4b1-device-checklist.md). Ver el spec §4–§6. No ejecutar hasta completarlas.
