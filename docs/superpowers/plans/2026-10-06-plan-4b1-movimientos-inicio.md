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
- `bun run start` puede reescribir `tsconfig.json` en el checkout principal (formato y la lista `include`). Ese cambio no es parte del plan: no agregarlo a ningún commit (los `git add` de cada tarea nombran sus archivos).
- La fila editable (`TransactionRow`) se crea en la Task 6 para que las Tasks 7 y 8 no dependan entre sí.

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
| `src/features/transactions/{expense-draft,messages}.ts` | Borrador del panel (crear/editar) y textos compartidos | 6 |
| `src/features/transactions/components/{ExpenseSheet,ExpenseForm,AmountDisplay,CategoryPicker,ExpenseDateChips,ExpenseActions,TransactionRow}.tsx` | Panel de gasto y fila editable | 6 |
| `src/features/transactions/hooks.ts` (mod.) | `useExpenseSheet` | 6 |
| `src/components/{AddFab,FieldLabel}.tsx`, `src/components/{SkewButton,TextField}.tsx` (mod.), `app/dev/gallery.tsx` (mod.) | Botón "+", etiqueta de campo, botón deshabilitado, galería | 6 |
| `src/features/transactions/filters.ts` (mod.), `src/features/transactions/components/{TransactionsScreen,FilterBar,DayHeader}.tsx`, `app/(tabs)/transactions.tsx` (mod.) | Movimientos | 7 |
| `src/theme/tokens.ts`, `src/components/Amount.tsx`, `src/features/summary/hooks.ts` (mod.), `src/features/summary/components/{HomeScreen,SummaryBlock,DayTag,RecentTransactions}.tsx`, `app/(tabs)/index.tsx` (mod.) | Inicio | 8 |
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

### Task 6: Panel de gasto (crear y editar), botón "+" y fila editable

**Files:**
- Install: `@react-native-community/datetimepicker` (`bunx expo install`)
- Create: `src/features/transactions/expense-draft.ts`, `src/features/transactions/messages.ts`, `src/components/FieldLabel.tsx`, `src/components/AddFab.tsx`, `src/features/transactions/components/{AmountDisplay,ExpenseDateChips,CategoryPicker,ExpenseActions,ExpenseForm,ExpenseSheet,TransactionRow}.tsx`
- Modify: `src/components/SkewButton.tsx`, `src/components/TextField.tsx`, `src/features/transactions/hooks.ts`, `app/dev/gallery.tsx`
- Test: `tests/unit/src/features/transactions/expense-draft.test.ts`

**Interfaces:**
- Consumes: Task 1 (`TextField`), Task 2 (`localDate`, `toLocalDate`, `addDays`, `isSameDate`, `formatDayLabel`), Task 3 (`pressKey`, `textToCents`, `centsToText`, `formatAmountInput`, `AmountKey`, `AmountKeypad`, `SkewChip`, `OptionSheet`, `PlaceholderRows`), Task 4 (`DateChoice`, `occurredAtFor`, `TransactionListItem`, `presentRow`, `CURRENCY_LABELS`, `TxSource`), Task 5 (`NewExpense`, `ExpenseChanges`, `useCreateExpense`, `useUpdateExpense`, `useSetIgnored`, `useDeleteExpense`, `useCategories`, `useRecentCategories`, `useProfile`, `useTimeZone`).
- Produces:
  - `messages.ts`: `NO_TRANSACTIONS`, `LOAD_TRANSACTIONS_ERROR`, `SAVE_ERROR`, `AMOUNT_REQUIRED` (strings).
  - `expense-draft.ts`: `interface ExpenseDraft { amountText: string; currency: Currency; merchant: string; categoryId: string | null; date: DateChoice }`; `emptyDraft(currency: Currency): ExpenseDraft`; `dateChoiceOf(occurredAt: string, now: Date, timeZone: string): DateChoice`; `draftFromItem(item: TransactionListItem, now: Date, timeZone: string): ExpenseDraft`; `canSave(draft: ExpenseDraft): boolean`; `draftToNewExpense(draft: ExpenseDraft, now: Date, timeZone: string): NewExpense`; `draftToChanges(draft: ExpenseDraft, original: ExpenseDraft, source: TxSource, now: Date, timeZone: string): ExpenseChanges`.
  - `<FieldLabel text={string} decorative?: boolean />`; `<AddFab onPress={() => void} />` (posición absoluta abajo a la derecha); `SkewButton` acepta `disabled?: boolean`.
  - `<ExpenseSheet visible={boolean} item={TransactionListItem | null} onClose={() => void} />`
  - `<TransactionRow item={TransactionListItem} onPress={(item: TransactionListItem) => void} />` (memo)
  - `useExpenseSheet(): { openNew: () => void; openEdit: (item: TransactionListItem) => void; sheet: { visible: boolean; item: TransactionListItem | null; onClose: () => void } }` en `@/features/transactions/hooks`.

- [ ] **Step 1: Instalar el selector de fecha**

Run: `bunx expo install @react-native-community/datetimepicker` → `package.json` lo agrega con la versión que corresponde al SDK 57 (Expo Go ya trae el módulo nativo; no hace falta plugin en `app.json`).
Run: `grep -rln "onValueChange" node_modules/@react-native-community/datetimepicker/src` → si aparece algún archivo, la versión instalada usa `onValueChange` (código del Step 5). Si no aparece nada, en `ExpenseDateChips` usar la variante con `onChange` indicada en el Step 5.

- [ ] **Step 2: Test del borrador (falla)**

`tests/unit/src/features/transactions/expense-draft.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  canSave,
  dateChoiceOf,
  draftFromItem,
  draftToChanges,
  draftToNewExpense,
  emptyDraft,
} from '@/features/transactions/expense-draft';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { localDate } from '@/lib/dates';

const SD = 'America/Santo_Domingo';
// martes 6 de octubre, 22:30 en Santo Domingo (ya es 7 en UTC)
const now = new Date('2026-10-07T02:30:00Z');

const item: TransactionListItem = {
  id: 't1',
  amount: 275.7,
  currency: 'USD',
  merchant: null,
  occurredAt: '2026-10-06T03:00:00Z', // lun 5, 23:00 → AYER
  categoryId: 'c1',
  categoryName: 'Comida',
  isIgnored: false,
  source: 'manual',
  bankCode: null,
};

describe('emptyDraft', () => {
  it('starts empty, today, in the given currency', () => {
    expect(emptyDraft('DOP')).toEqual({ amountText: '', currency: 'DOP', merchant: '', categoryId: null, date: { kind: 'today' } });
  });
});

describe('dateChoiceOf', () => {
  it('names today and yesterday in the profile zone, otherwise keeps the local date', () => {
    expect(dateChoiceOf('2026-10-07T01:00:00Z', now, SD)).toEqual({ kind: 'today' });
    expect(dateChoiceOf('2026-10-06T03:00:00Z', now, SD)).toEqual({ kind: 'yesterday' });
    expect(dateChoiceOf('2026-10-01T15:00:00Z', now, SD)).toEqual({ kind: 'other', date: localDate(2026, 10, 1) });
  });
});

describe('draftFromItem', () => {
  it('preloads the expense with its amount as editable text', () => {
    expect(draftFromItem(item, now, SD)).toEqual({
      amountText: '275.70',
      currency: 'USD',
      merchant: '',
      categoryId: 'c1',
      date: { kind: 'yesterday' },
    });
  });
});

describe('canSave', () => {
  it('requires an amount greater than zero', () => {
    expect(canSave(emptyDraft('DOP'))).toBe(false);
    expect(canSave({ ...emptyDraft('DOP'), amountText: '0.' })).toBe(false);
    expect(canSave({ ...emptyDraft('DOP'), amountText: '0.05' })).toBe(true);
  });
});

describe('draftToNewExpense', () => {
  it('converts the draft to cents and the chosen day to an instant', () => {
    const draft = { ...emptyDraft('DOP'), amountText: '1234.5', merchant: 'Colmado', date: { kind: 'yesterday' as const } };
    expect(draftToNewExpense(draft, now, SD)).toEqual({
      amountCents: 123450,
      currency: 'DOP',
      merchant: 'Colmado',
      categoryId: null,
      occurredAt: '2026-10-06T02:30:00.000Z',
    });
  });
});

describe('draftToChanges', () => {
  const original = draftFromItem(item, now, SD);

  it('never sends currency or date for an imported transaction', () => {
    const draft = { ...original, amountText: '300', currency: 'DOP' as const, date: { kind: 'today' as const } };
    expect(draftToChanges(draft, original, 'email', now, SD)).toEqual({ amountCents: 30000, merchant: '', categoryId: 'c1' });
  });
  it('keeps the original time of a manual expense when the day did not change', () => {
    expect(draftToChanges(original, original, 'manual', now, SD)).toEqual({
      amountCents: 27570,
      merchant: '',
      categoryId: 'c1',
      currency: 'USD',
    });
  });
  it('sends the new instant when the day of a manual expense changed', () => {
    const draft = { ...original, date: { kind: 'today' as const } };
    expect(draftToChanges(draft, original, 'manual', now, SD)).toMatchObject({ occurredAt: '2026-10-07T02:30:00.000Z' });
  });
});
```
Run: `bun run test` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar el borrador y los textos**

`src/features/transactions/messages.ts`:
```ts
/** Textos de Movimientos que se repiten en varias pantallas. */
export const NO_TRANSACTIONS = 'Todavía no hay movimientos. Agrega tu primer gasto con +';
export const LOAD_TRANSACTIONS_ERROR = 'No se pudieron cargar tus movimientos. Tira hacia abajo para reintentar.';
export const SAVE_ERROR = 'No se pudo guardar. Revisa tu conexión e inténtalo otra vez.';
export const AMOUNT_REQUIRED = 'Escribe un monto mayor que cero.';
```

`src/features/transactions/expense-draft.ts`:
```ts
import { addDays, isSameDate, toLocalDate } from '@/lib/dates';
import type { Currency, TxSource } from '@/types/database';
import { centsToText, textToCents } from './amount-input';
import type { ExpenseChanges, NewExpense } from './api';
import { occurredAtFor, type DateChoice } from './expense-date';
import type { TransactionListItem } from './mapping';

/** Lo que el usuario tiene escrito en el panel de gasto. */
export interface ExpenseDraft {
  amountText: string;
  currency: Currency;
  merchant: string;
  categoryId: string | null;
  date: DateChoice;
}

export function emptyDraft(currency: Currency): ExpenseDraft {
  return { amountText: '', currency, merchant: '', categoryId: null, date: { kind: 'today' } };
}

/** Fecha de un movimiento existente como Hoy / Ayer / otro día, en la zona del perfil. */
export function dateChoiceOf(occurredAt: string, now: Date, timeZone: string): DateChoice {
  const date = toLocalDate(new Date(occurredAt), timeZone);
  const today = toLocalDate(now, timeZone);
  if (isSameDate(date, today)) return { kind: 'today' };
  if (isSameDate(date, addDays(today, -1))) return { kind: 'yesterday' };
  return { kind: 'other', date };
}

export function draftFromItem(item: TransactionListItem, now: Date, timeZone: string): ExpenseDraft {
  return {
    amountText: centsToText(Math.round(item.amount * 100)),
    currency: item.currency,
    merchant: item.merchant ?? '',
    categoryId: item.categoryId,
    date: dateChoiceOf(item.occurredAt, now, timeZone),
  };
}

export function canSave(draft: ExpenseDraft): boolean {
  return textToCents(draft.amountText) > 0;
}

export function draftToNewExpense(draft: ExpenseDraft, now: Date, timeZone: string): NewExpense {
  return {
    amountCents: textToCents(draft.amountText),
    currency: draft.currency,
    merchant: draft.merchant,
    categoryId: draft.categoryId,
    occurredAt: occurredAtFor(draft.date, now, timeZone),
  };
}

function sameChoice(a: DateChoice, b: DateChoice): boolean {
  if (a.kind === 'other' && b.kind === 'other') return isSameDate(a.date, b.date);
  return a.kind === b.kind;
}

/**
 * Cambios a guardar al editar. La moneda y la fecha solo se envían en gastos manuales (en los importados
 * son datos del banco); la fecha solo si el usuario cambió el día, para conservar la hora original.
 */
export function draftToChanges(
  draft: ExpenseDraft,
  original: ExpenseDraft,
  source: TxSource,
  now: Date,
  timeZone: string,
): ExpenseChanges {
  const base = { amountCents: textToCents(draft.amountText), merchant: draft.merchant, categoryId: draft.categoryId };
  if (source !== 'manual') return base;
  return {
    ...base,
    currency: draft.currency,
    ...(sameChoice(draft.date, original.date) ? {} : { occurredAt: occurredAtFor(draft.date, now, timeZone) }),
  };
}
```
Run: `bun run test` → PASS.

- [ ] **Step 4: Piezas genéricas (`FieldLabel`, `TextField`, `SkewButton` deshabilitado, `AddFab`)**

`src/components/FieldLabel.tsx`:
```tsx
import { Text } from 'react-native';
import { colors, fonts, typeScale } from '@/theme/tokens';

interface Props {
  text: string;
  /** true si el control ya se anuncia con su propia etiqueta (p. ej. un TextInput). */
  decorative?: boolean;
}

/** Etiqueta pequeña sobre un campo o una fila de chips. */
export function FieldLabel({ text, decorative = false }: Props) {
  return (
    <Text
      importantForAccessibility={decorative ? 'no' : 'auto'}
      style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginBottom: 6 }}
    >
      {text}
    </Text>
  );
}
```

En `src/components/TextField.tsx` (DRY con `FieldLabel`):
1. Agregar `import { FieldLabel } from './FieldLabel';`.
2. Reemplazar el bloque `<Text importantForAccessibility="no" style={{ … marginBottom: 6 }}>{label}</Text>` por `<FieldLabel text={label} decorative />`.
3. `Text` sigue importado (lo usa el mensaje de error).

`src/components/SkewButton.tsx` (reemplazar completo):
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
  /** Apagado (p. ej. "Guardar" sin monto): fondo `panel`, texto `ash`, no responde. */
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Botón inclinado: al tocarlo se hunde 4 dp en diagonal y vibra (sin desplazamiento si se redujeron animaciones). */
export function SkewButton({ label, onPress, variant = 'primary', loading = false, disabled = false, accessibilityHint }: Props) {
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
  const inactive = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: inactive }}
      disabled={inactive}
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
            backgroundColor: primary ? (disabled ? colors.panel : colors.blood) : 'transparent',
            borderWidth: primary ? 0 : 2,
            borderColor: disabled ? colors.ash : colors.paper,
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
              color: disabled ? colors.ash : colors.paper,
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

`src/components/AddFab.tsx`:
```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { tapFeedback } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

const SIZE = 56;
/** Lado del cuadrado girado 45°: su diagonal (~56 dp) llena el área táctil. */
const DIAMOND = 40;

/** Botón flotante "+": rombo rojo abajo a la derecha que abre el panel de gasto. */
export function AddFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar gasto"
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{ position: 'absolute', right: 20, bottom: 20, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: DIAMOND, height: DIAMOND, backgroundColor: colors.blood, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute' }}>
        <Ionicons name="add" size={28} color={colors.paper} />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 5: Componentes del panel**

`src/features/transactions/components/AmountDisplay.tsx`:
```tsx
import { Pressable, Text, View } from 'react-native';
import { moneyAccessibilityLabel } from '@/lib/money';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';
import { formatAmountInput, textToCents } from '../amount-input';

interface Props {
  text: string;
  currency: Currency;
  /** El teclado propio está activo: se muestra el cursor rojo. */
  active: boolean;
  onPress: () => void;
}

/** Monto gigante mientras se escribe (cifras de ancho fijo, nunca inclinado). Tocarlo vuelve al teclado propio. */
export function AmountDisplay({ text, currency, active, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Monto: ${moneyAccessibilityLabel(textToCents(text) / 100, currency)}`}
      accessibilityHint="Muestra el teclado de montos"
      accessibilityLiveRegion="polite"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: typeScale.amountHero + 8, marginBottom: 12 }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          flexShrink: 1,
          fontFamily: fonts.amount,
          fontSize: typeScale.amountHero,
          lineHeight: typeScale.amountHero,
          color: colors.paper,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatAmountInput(text, currency)}
      </Text>
      {active ? (
        <View style={{ width: 4, height: typeScale.amountHero * 0.8, marginLeft: 4, backgroundColor: colors.blood }} />
      ) : null}
    </Pressable>
  );
}
```

`src/features/transactions/components/ExpenseDateChips.tsx`:
```tsx
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { View } from 'react-native';
import { SkewChip } from '@/components/SkewChip';
import { formatDayLabel, localDate } from '@/lib/dates';
import type { DateChoice } from '../expense-date';

interface Props {
  value: DateChoice;
  onChange: (choice: DateChoice) => void;
}

/** Hoy / Ayer / Otro día. "Otro día" abre el calendario nativo de Android, sin días futuros. */
export function ExpenseDateChips({ value, onChange }: Props) {
  const openCalendar = () => {
    const initial = value.kind === 'other' ? new Date(value.date.year, value.date.month - 1, value.date.day) : new Date();
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      maximumDate: new Date(),
      onValueChange: (_event, date) => {
        // El calendario devuelve el día elegido en la hora del dispositivo: se leen sus componentes locales.
        if (date) onChange({ kind: 'other', date: localDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) });
      },
    });
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      <SkewChip label="Hoy" selected={value.kind === 'today'} onPress={() => onChange({ kind: 'today' })} />
      <SkewChip label="Ayer" selected={value.kind === 'yesterday'} onPress={() => onChange({ kind: 'yesterday' })} />
      <SkewChip
        label={value.kind === 'other' ? formatDayLabel(value.date) : 'Otro día'}
        selected={value.kind === 'other'}
        onPress={openCalendar}
      />
    </View>
  );
}
```
Variante si la versión instalada no tiene `onValueChange` (Step 1): reemplazar esa propiedad por
```tsx
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange({ kind: 'other', date: localDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) });
      },
```

`src/features/transactions/components/CategoryPicker.tsx`:
```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { OptionSheet } from '@/components/OptionSheet';
import { SkewChip } from '@/components/SkewChip';
import { useCategories, useRecentCategories } from '@/features/categories/hooks';

interface Props {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

/** Las 3 categorías usadas más recientemente + "Más…" (lista completa). Tocar la elegida la quita. */
export function CategoryPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const recent = useRecentCategories();
  const all = useCategories().data ?? [];
  const chosen = all.find((category) => category.id === value);
  // Si la elegida no está entre las recientes (p. ej. al editar), se muestra también.
  const chips = chosen && !recent.some((category) => category.id === chosen.id) ? [...recent, chosen] : recent;
  const options = all.map((category) => ({ value: category.id, label: category.name }));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
      {chips.map((category) => (
        <SkewChip
          key={category.id}
          label={category.name}
          selected={category.id === value}
          onPress={() => onChange(category.id === value ? null : category.id)}
        />
      ))}
      <SkewChip label="Más…" onPress={() => setOpen(true)} />
      <OptionSheet
        visible={open}
        title="CATEGORÍA"
        options={options}
        selected={value}
        noneLabel="Sin categoría"
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
```

`src/features/transactions/components/ExpenseActions.tsx`:
```tsx
import { Alert, View } from 'react-native';
import { SkewButton } from '@/components/SkewButton';
import { useDeleteExpense, useSetIgnored } from '../hooks';
import type { TransactionListItem } from '../mapping';
import { SAVE_ERROR } from '../messages';

interface Props {
  item: TransactionListItem;
  onDone: () => void;
  onError: (message: string) => void;
}

/** Acciones de edición: ignorar/contar (cualquier movimiento) y borrar (solo manuales, con confirmación). */
export function ExpenseActions({ item, onDone, onError }: Props) {
  const setIgnored = useSetIgnored();
  const remove = useDeleteExpense();
  const callbacks = { onSuccess: onDone, onError: () => onError(SAVE_ERROR) };
  const confirmDelete = () =>
    Alert.alert('¿Borrar este gasto?', 'No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate(item.id, callbacks) },
    ]);
  return (
    <View style={{ marginTop: 16 }}>
      <SkewButton
        variant="ghost"
        label={item.isIgnored ? 'Contar este gasto' : 'Ignorar este gasto'}
        loading={setIgnored.isPending}
        onPress={() => setIgnored.mutate({ id: item.id, ignored: !item.isIgnored }, callbacks)}
      />
      {item.source === 'manual' ? (
        <View style={{ marginTop: 12 }}>
          <SkewButton variant="ghost" label="Borrar" loading={remove.isPending} onPress={confirmDelete} />
        </View>
      ) : null}
    </View>
  );
}
```

`src/features/transactions/components/ExpenseForm.tsx`:
```tsx
import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { AmountKeypad } from '@/components/AmountKeypad';
import { FieldLabel } from '@/components/FieldLabel';
import { SkewButton } from '@/components/SkewButton';
import { SkewChip } from '@/components/SkewChip';
import { TextField } from '@/components/TextField';
import { useProfile, useTimeZone } from '@/features/profile/hooks';
import { formatDayLabel, toLocalDate } from '@/lib/dates';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { Currency } from '@/types/database';
import { pressKey, type AmountKey } from '../amount-input';
import { canSave, draftFromItem, draftToChanges, draftToNewExpense, emptyDraft, type ExpenseDraft } from '../expense-draft';
import { CURRENCY_LABELS } from '../filters';
import { useCreateExpense, useUpdateExpense } from '../hooks';
import type { TransactionListItem } from '../mapping';
import { AMOUNT_REQUIRED, SAVE_ERROR } from '../messages';
import { AmountDisplay } from './AmountDisplay';
import { CategoryPicker } from './CategoryPicker';
import { ExpenseActions } from './ExpenseActions';
import { ExpenseDateChips } from './ExpenseDateChips';

const CURRENCIES: readonly Currency[] = ['DOP', 'USD'];

interface Props {
  /** Sin `item` crea un gasto manual; con `item` lo edita. */
  item?: TransactionListItem;
  onDone: () => void;
}

/** Panel de gasto en el orden del mockup: monto, moneda, comercio, categoría, fecha, teclado y "Guardar". */
export function ExpenseForm({ item, onDone }: Props) {
  const timeZone = useTimeZone();
  const primaryCurrency = useProfile().data?.primaryCurrency ?? 'DOP';
  const [original] = useState<ExpenseDraft>(() =>
    item ? draftFromItem(item, new Date(), timeZone) : emptyDraft(primaryCurrency),
  );
  const [draft, setDraft] = useState<ExpenseDraft>(original);
  const [typingMerchant, setTypingMerchant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  // La moneda y la fecha de un movimiento importado por correo son datos del banco: no se editan.
  const bankData = item !== undefined && item.source !== 'manual';
  const ready = canSave(draft);

  const change = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };
  const onKey = (key: AmountKey) => {
    setDraft((current) => ({ ...current, amountText: pressKey(current.amountText, key) }));
    setError(null);
  };
  const save = () => {
    const now = new Date();
    const callbacks = { onSuccess: onDone, onError: () => setError(SAVE_ERROR) };
    if (item) {
      updateExpense.mutate({ id: item.id, changes: draftToChanges(draft, original, item.source, now, timeZone) }, callbacks);
    } else {
      createExpense.mutate(draftToNewExpense(draft, now, timeZone), callbacks);
    }
  };

  return (
    <View>
      <AmountDisplay
        text={draft.amountText}
        currency={draft.currency}
        active={!typingMerchant}
        onPress={() => Keyboard.dismiss()}
      />
      {bankData ? null : (
        <>
          <FieldLabel text="Moneda" />
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {CURRENCIES.map((currency) => (
              <SkewChip
                key={currency}
                label={CURRENCY_LABELS[currency]}
                selected={draft.currency === currency}
                onPress={() => change('currency', currency)}
              />
            ))}
          </View>
        </>
      )}
      <TextField
        label="Comercio o descripción"
        value={draft.merchant}
        onChangeText={(merchant) => change('merchant', merchant)}
        maxLength={80}
        autoCapitalize="sentences"
        returnKeyType="done"
        onFocus={() => setTypingMerchant(true)}
        onBlur={() => setTypingMerchant(false)}
      />
      <FieldLabel text="Categoría" />
      <CategoryPicker value={draft.categoryId} onChange={(categoryId) => change('categoryId', categoryId)} />
      <FieldLabel text="Fecha" />
      {item && bankData ? (
        <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.paper, marginBottom: 12 }}>
          {formatDayLabel(toLocalDate(new Date(item.occurredAt), timeZone))} · fecha del banco
        </Text>
      ) : (
        <ExpenseDateChips value={draft.date} onChange={(date) => change('date', date)} />
      )}
      {typingMerchant ? null : <AmountKeypad onKey={onKey} />}
      <View style={{ marginTop: 16 }}>
        <SkewButton
          label="Guardar"
          onPress={save}
          disabled={!ready}
          loading={createExpense.isPending || updateExpense.isPending}
          accessibilityHint={ready ? undefined : AMOUNT_REQUIRED}
        />
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}
        >
          {error}
        </Text>
      ) : null}
      {item ? <ExpenseActions item={item} onDone={onDone} onError={setError} /> : null}
    </View>
  );
}
```
La moneda por defecto sale de `profiles.primary_currency`; el perfil ya está en caché porque ambas pantallas llaman `useTimeZone()` antes de que se abra el panel.

`src/features/transactions/components/ExpenseSheet.tsx`:
```tsx
import { SlamSheet } from '@/components/SlamSheet';
import type { TransactionListItem } from '../mapping';
import { ExpenseForm } from './ExpenseForm';

interface Props {
  visible: boolean;
  /** null = gasto nuevo. */
  item: TransactionListItem | null;
  onClose: () => void;
}

/** Panel de gasto. `SlamSheet` desmonta el contenido al cerrarse, así que cada apertura empieza limpia. */
export function ExpenseSheet({ visible, item, onClose }: Props) {
  return (
    <SlamSheet visible={visible} onClose={onClose} title={item ? 'EDITAR GASTO' : 'NUEVO GASTO'}>
      <ExpenseForm key={item?.id ?? 'new'} item={item ?? undefined} onDone={onClose} />
    </SlamSheet>
  );
}
```

`src/features/transactions/components/TransactionRow.tsx`:
```tsx
import { memo } from 'react';
import { SkewRow } from '@/components/SkewRow';
import { presentRow, type TransactionListItem } from '../mapping';

interface Props {
  item: TransactionListItem;
  onPress: (item: TransactionListItem) => void;
}

/** Fila de un movimiento (monto en su moneda original); tocarla abre el panel de edición. */
export const TransactionRow = memo(function TransactionRow({ item, onPress }: Props) {
  const row = presentRow(item);
  return (
    <SkewRow
      title={row.title}
      subtitle={row.subtitle}
      badge={row.badge}
      muted={row.muted}
      amount={{ value: item.amount, currency: item.currency }}
      onPress={() => onPress(item)}
    />
  );
});
```

Al final de `src/features/transactions/hooks.ts` agregar (y sumar `import { useCallback, useState } from 'react';` e `import type { TransactionListItem } from './mapping';` a los imports):
```ts
/** Estado del panel de gasto compartido por Inicio y Movimientos: cerrado, gasto nuevo o edición de `item`. */
export function useExpenseSheet() {
  const [state, setState] = useState<{ item: TransactionListItem | null } | null>(null);
  const openNew = useCallback(() => setState({ item: null }), []);
  const openEdit = useCallback((item: TransactionListItem) => setState({ item }), []);
  const close = useCallback(() => setState(null), []);
  return { openNew, openEdit, sheet: { visible: state !== null, item: state?.item ?? null, onClose: close } };
}
```

- [ ] **Step 6: Galería**

En `app/dev/gallery.tsx`:
1. Imports nuevos: `AddFab`, `AmountKeypad`, `PlaceholderRows`, `SkewChip` (de `@/components/...`) y `import { formatAmountInput, pressKey } from '@/features/transactions/amount-input';`.
2. Estado nuevo junto a los demás: `const [chip, setChip] = useState(0);` y `const [typed, setTyped] = useState('');`.
3. Después del bloque `<Section name="Campo de texto" />` + su `TextField`, insertar:
```tsx
      <Section name="Chips" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['Hoy', 'Ayer', 'Otro día'].map((label, i) => (
          <SkewChip key={label} label={label} selected={chip === i} onPress={() => setChip(i)} />
        ))}
      </View>

      <Section name="Teclado de montos" />
      <Text style={{ fontFamily: fonts.amount, fontSize: typeScale.amountHero, color: colors.paper, fontVariant: ['tabular-nums'] }}>
        {formatAmountInput(typed, 'DOP')}
      </Text>
      <AmountKeypad onKey={(key) => setTyped((current) => pressKey(current, key))} />

      <Section name="Cargando" />
      <PlaceholderRows />

      <Section name="Botón agregar" />
      <View style={{ height: 72 }}>
        <AddFab onPress={() => setSheet(true)} />
      </View>
```
4. En la sección "Botones", después del primer `SkewButton` ("Agregar gasto") y su separador, agregar `<SkewButton label="Guardar (sin monto)" disabled onPress={() => undefined} />` seguido de `<View style={{ height: 12 }} />`.

- [ ] **Step 7: Verificar y commit**

Run: `bun run check` → verde. Run: `bun run verify:bundle` → `Exported`.
Run: `grep -rnE "#[0-9a-fA-F]{3,8}|rgba\(" src/features src/components --include=*.tsx` → sin resultados.
```bash
git add package.json bun.lock src/features/transactions src/components/FieldLabel.tsx src/components/TextField.tsx src/components/SkewButton.tsx src/components/AddFab.tsx app/dev/gallery.tsx tests/unit/src/features/transactions/expense-draft.test.ts
git commit -m "feat(app): add the expense sheet with custom keypad, date chips and edit actions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(Si el lockfile se llama distinto —`bun.lockb`—, agregar ese.)

---

### Task 7: Movimientos

**Files:**
- Modify: `src/features/transactions/filters.ts`, `app/(tabs)/transactions.tsx`
- Create: `src/features/transactions/components/{TransactionsScreen,FilterBar,DayHeader}.tsx`
- Test: `tests/unit/src/features/transactions/filters.test.ts` (ampliar)

**Interfaces:**
- Consumes: Task 2 (`ListScreen`), Task 3 (`SkewChip`, `OptionSheet`, `Option`, `PlaceholderRows`), Task 4 (`TransactionFilters`, `DEFAULT_FILTERS`, `PERIOD_LABELS`, `BANK_LABELS`, `CURRENCY_LABELS`, `Period`, `groupByDay`, `ListEntry`, `TransactionListItem`), Task 5 (`useTransactionList`, `useCategories`, `useTimeZone`), Task 6 (`AddFab`, `ExpenseSheet`, `TransactionRow`, `useExpenseSheet`, `NO_TRANSACTIONS`, `LOAD_TRANSACTIONS_ERROR`).
- Produces: `countLabel(count: number): string`, `emptyMessage(filters: TransactionFilters): string` (en `filters.ts`); `<TransactionsScreen />`; `<FilterBar filters onChange count={number | null} />`; `<DayHeader title={string} />`.

- [ ] **Step 1: Ampliar el test de filtros (falla)**

Agregar a `tests/unit/src/features/transactions/filters.test.ts` (y `countLabel, emptyMessage` al import):
```ts
describe('countLabel', () => {
  it('pluralizes and groups thousands', () => {
    expect(countLabel(0)).toBe('0 movimientos');
    expect(countLabel(1)).toBe('1 movimiento');
    expect(countLabel(38)).toBe('38 movimientos');
    expect(countLabel(1234)).toBe('1,234 movimientos');
  });
});

describe('emptyMessage', () => {
  it('invites to add the first expense when nothing limits the list', () => {
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: 'all' })).toBe('Todavía no hay movimientos. Agrega tu primer gasto con +');
  });
  it('names the period when only the period limits the list', () => {
    expect(emptyMessage(DEFAULT_FILTERS)).toBe('No hay movimientos este mes. Agrega uno con +');
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: 'week' })).toBe('No hay movimientos esta semana. Agrega uno con +');
  });
  it('points at the filters when any other filter is on', () => {
    expect(emptyMessage({ ...DEFAULT_FILTERS, review: true })).toBe('No hay movimientos con estos filtros.');
    expect(emptyMessage({ ...DEFAULT_FILTERS, period: 'all', currency: 'USD' })).toBe('No hay movimientos con estos filtros.');
  });
});
```
Run: `bun run test` → FAIL.

- [ ] **Step 2: Implementar en `filters.ts`**

Agregar `import { NO_TRANSACTIONS } from './messages';` a los imports y al final del archivo:
```ts
const PERIOD_PHRASE: Record<Exclude<Period, 'all'>, string> = { week: 'esta semana', month: 'este mes' };
const counter = new Intl.NumberFormat('en-US');

/** "38 movimientos" / "1 movimiento". */
export function countLabel(count: number): string {
  return `${counter.format(count)} ${count === 1 ? 'movimiento' : 'movimientos'}`;
}

/** Mensaje de lista vacía según lo que la está limitando. */
export function emptyMessage(filters: TransactionFilters): string {
  if (filters.categoryId || filters.currency || filters.bankCode || filters.review) return 'No hay movimientos con estos filtros.';
  if (filters.period === 'all') return NO_TRANSACTIONS;
  return `No hay movimientos ${PERIOD_PHRASE[filters.period]}. Agrega uno con +`;
}
```
Run: `bun run test` → PASS.

- [ ] **Step 3: Componentes de Movimientos**

`src/features/transactions/components/DayHeader.tsx`:
```tsx
import { Text, View } from 'react-native';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

/** Encabezado de día inclinado ("HOY", "AYER", "MAR 06 / OCT"). */
export function DayHeader({ title }: { title: string }) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={title}
      style={{ alignSelf: 'flex-start', marginTop: 18, marginBottom: 6, transform: [{ rotate: `${angles.title}deg` }] }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: typeScale.displaySm, color: colors.paper }}>{title}</Text>
    </View>
  );
}
```

`src/features/transactions/components/FilterBar.tsx`:
```tsx
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { OptionSheet, type Option } from '@/components/OptionSheet';
import { SkewChip } from '@/components/SkewChip';
import { useCategories } from '@/features/categories/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';
import type { BankCode, Currency } from '@/types/database';
import { BANK_LABELS, countLabel, CURRENCY_LABELS, PERIOD_LABELS, type Period, type TransactionFilters } from '../filters';

const PERIODS: readonly Period[] = ['week', 'month', 'all'];
const CURRENCIES: readonly Currency[] = ['DOP', 'USD'];
const BANKS: readonly BankCode[] = ['bhd', 'banreservas', 'popular', 'apap'];
const CURRENCY_OPTIONS: readonly Option<Currency>[] = CURRENCIES.map((value) => ({ value, label: CURRENCY_LABELS[value] }));
const BANK_OPTIONS: readonly Option<BankCode>[] = BANKS.map((value) => ({ value, label: BANK_LABELS[value] }));

type SheetName = 'category' | 'currency' | 'bank';

interface Props {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  /** Total de movimientos que cumplen los filtros; null mientras carga. */
  count: number | null;
}

/** Chips de período, filtros que abren una hoja de opciones, "Revisar" y el conteo total. */
export function FilterBar({ filters, onChange, count }: Props) {
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const categories = useCategories().data ?? [];
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const categoryName = categories.find((category) => category.id === filters.categoryId)?.name;
  const close = () => setSheet(null);
  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {PERIODS.map((period) => (
          <SkewChip
            key={period}
            label={PERIOD_LABELS[period]}
            selected={filters.period === period}
            onPress={() => onChange({ ...filters, period })}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SkewChip label={categoryName ?? 'Categoría'} selected={filters.categoryId !== null} onPress={() => setSheet('category')} />
        <SkewChip
          label={filters.currency ? CURRENCY_LABELS[filters.currency] : 'Moneda'}
          selected={filters.currency !== null}
          onPress={() => setSheet('currency')}
        />
        <SkewChip
          label={filters.bankCode ? BANK_LABELS[filters.bankCode] : 'Banco'}
          selected={filters.bankCode !== null}
          onPress={() => setSheet('bank')}
        />
        <SkewChip label="Revisar" selected={filters.review} onPress={() => onChange({ ...filters, review: !filters.review })} />
      </ScrollView>
      {count !== null ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginTop: 8 }}
        >
          {countLabel(count)}
        </Text>
      ) : null}
      <OptionSheet
        visible={sheet === 'category'}
        title="CATEGORÍA"
        options={categoryOptions}
        selected={filters.categoryId}
        noneLabel="Todas"
        onSelect={(categoryId) => onChange({ ...filters, categoryId })}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === 'currency'}
        title="MONEDA"
        options={CURRENCY_OPTIONS}
        selected={filters.currency}
        noneLabel="Todas"
        onSelect={(currency) => onChange({ ...filters, currency })}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === 'bank'}
        title="BANCO"
        options={BANK_OPTIONS}
        selected={filters.bankCode}
        noneLabel="Todos"
        onSelect={(bankCode) => onChange({ ...filters, bankCode })}
        onClose={close}
      />
    </View>
  );
}
```

`src/features/transactions/components/TransactionsScreen.tsx`:
```tsx
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, Text, type ListRenderItem } from 'react-native';
import { AddFab } from '@/components/AddFab';
import { ListScreen } from '@/components/ListScreen';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { useTimeZone } from '@/features/profile/hooks';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { DEFAULT_FILTERS, emptyMessage, type TransactionFilters } from '../filters';
import { groupByDay, type ListEntry } from '../grouping';
import { useExpenseSheet, useTransactionList } from '../hooks';
import type { TransactionListItem } from '../mapping';
import { LOAD_TRANSACTIONS_ERROR } from '../messages';
import { DayHeader } from './DayHeader';
import { ExpenseSheet } from './ExpenseSheet';
import { FilterBar } from './FilterBar';
import { TransactionRow } from './TransactionRow';

type Entry = ListEntry<TransactionListItem>;

/** Movimientos: lista paginada agrupada por día, filtros, "tirar para actualizar" y botón "+". */
export function TransactionsScreen() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [pulling, setPulling] = useState(false);
  const timeZone = useTimeZone();
  const list = useTransactionList(filters);
  const { openNew, openEdit, sheet } = useExpenseSheet();

  const entries = useMemo(
    () => groupByDay(list.data?.pages.flatMap((page) => page.items) ?? [], new Date(), timeZone),
    [list.data, timeZone],
  );
  const renderItem = useCallback<ListRenderItem<Entry>>(
    ({ item }) =>
      item.kind === 'header' ? <DayHeader title={item.title} /> : <TransactionRow item={item.item} onPress={openEdit} />,
    [openEdit],
  );
  const refresh = () => {
    setPulling(true);
    list.refetch().finally(() => setPulling(false));
  };
  const loadMore = () => {
    if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  };

  const messageStyle = { fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginTop: 12 };
  const empty = list.isPending ? (
    <PlaceholderRows count={6} />
  ) : (
    <Text style={list.isError ? { ...messageStyle, color: colors.signal } : messageStyle}>
      {list.isError ? LOAD_TRANSACTIONS_ERROR : emptyMessage(filters)}
    </Text>
  );

  return (
    <>
      <ListScreen
        title="MOVIMIENTOS"
        backdrop={1}
        header={<FilterBar filters={filters} onChange={setFilters} count={list.data?.pages[0]?.count ?? null} />}
        data={entries}
        keyExtractor={(entry) => entry.key}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />
        }
        ListEmptyComponent={empty}
        ListFooterComponent={list.isFetchingNextPage ? <PlaceholderRows count={2} /> : null}
        floating={<AddFab onPress={openNew} />}
      />
      <ExpenseSheet {...sheet} />
    </>
  );
}
```

`app/(tabs)/transactions.tsx` (reemplazar completo):
```tsx
import { TransactionsScreen } from '@/features/transactions/components/TransactionsScreen';

export default function TransactionsTab() {
  return <TransactionsScreen />;
}
```

- [ ] **Step 4: Verificar y commit**

Run: `bun run check` → verde. Run: `bun run verify:bundle` → `Exported`.
```bash
git add src/features/transactions/filters.ts tests/unit/src/features/transactions/filters.test.ts src/features/transactions/components/TransactionsScreen.tsx src/features/transactions/components/FilterBar.tsx src/features/transactions/components/DayHeader.tsx "app/(tabs)/transactions.tsx"
git commit -m "feat(app): build the movements screen with day groups, filters and infinite scroll" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Inicio

**Files:**
- Modify: `src/theme/tokens.ts`, `src/components/Amount.tsx`, `src/features/summary/hooks.ts`, `app/(tabs)/index.tsx`
- Create: `src/features/summary/components/{HomeScreen,SummaryBlock,DayTag,RecentTransactions}.tsx`

**Interfaces:**
- Consumes: Task 2 (`Screen` con `aboveTitle`/`floating`/`refreshControl`, `toLocalDate`, `formatDayLabel`), Task 3 (`PlaceholderRows`), Task 4 (`comparisonText`), Task 5 (`useSpendingSummary`, `useActiveBudgets`, `useRecentTransactions`, `useTimeZone`, `summaryKeys`, `budgetKeys`, `transactionKeys`), Task 6 (`AddFab`, `ExpenseSheet`, `TransactionRow`, `useExpenseSheet`, `NO_TRANSACTIONS`, `LOAD_TRANSACTIONS_ERROR`).
- Produces: `typeScale.amountLarge = 32`; `Amount` acepta `size?: 'hero' | 'large' | 'row'`; `useHomeRefresh(): { refreshing: boolean; refresh: () => void }` en `@/features/summary/hooks`; `<HomeScreen />`, `<SummaryBlock period={BudgetPeriod} size={'hero' | 'large'} />`, `<DayTag label={string} />`, `<RecentTransactions onPressItem={(item: TransactionListItem) => void} />`.

Sin tests nuevos (pantallas; la lógica ya está cubierta en las Tasks 4–6).

- [ ] **Step 1: Monto mediano**

En `src/theme/tokens.ts`, dentro de `typeScale`, agregar `amountLarge: 32,` después de `amountHero: 52,`.

`src/components/Amount.tsx` (reemplazar completo):
```tsx
import { Text } from 'react-native';
import { formatMoney, moneyAccessibilityLabel } from '@/lib/money';
import { colors, fonts, typeScale, type ColorToken } from '@/theme/tokens';
import type { Currency } from '@/types/database';

const FONT_SIZE = { hero: typeScale.amountHero, large: typeScale.amountLarge, row: typeScale.amountRow } as const;
const LINE_HEIGHT = {
  hero: typeScale.amountHero,
  large: typeScale.amountLarge * 1.15,
  row: typeScale.amountRow * 1.25,
} as const;

interface Props {
  value: number;
  currency: Currency;
  size?: keyof typeof FONT_SIZE;
  tone?: ColorToken;
}

/** Monto. Regla del spec: nunca se inclina ni usa nota de rescate. */
export function Amount({ value, currency, size = 'row', tone = 'paper' }: Props) {
  return (
    <Text
      accessibilityLabel={moneyAccessibilityLabel(value, currency)}
      style={{
        fontFamily: fonts.amount,
        fontSize: FONT_SIZE[size],
        lineHeight: LINE_HEIGHT[size],
        color: colors[tone],
        fontVariant: ['tabular-nums'],
      }}
    >
      {formatMoney(value, currency)}
    </Text>
  );
}
```

- [ ] **Step 2: Actualizar Inicio al tirar hacia abajo**

`src/features/summary/hooks.ts` (reemplazar completo):
```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { budgetKeys } from '@/features/budgets/keys';
import { transactionKeys } from '@/features/transactions/keys';
import type { BudgetPeriod } from '@/types/database';
import { fetchSpendingSummary } from './api';
import { summaryKeys } from './keys';

export function useSpendingSummary(period: BudgetPeriod) {
  return useQuery({ queryKey: summaryKeys.period(period), queryFn: () => fetchSpendingSummary(period) });
}

/** "Tirar para actualizar" de Inicio: vuelve a pedir totales, presupuestos y últimos movimientos. */
export function useHomeRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      queryClient.refetchQueries({ queryKey: summaryKeys.all }),
      queryClient.refetchQueries({ queryKey: budgetKeys.all }),
      queryClient.refetchQueries({ queryKey: transactionKeys.recent() }),
    ]).finally(() => setRefreshing(false));
  }, [queryClient]);
  return { refreshing, refresh };
}
```

- [ ] **Step 3: Componentes de Inicio**

`src/features/summary/components/DayTag.tsx`:
```tsx
import { Text, View } from 'react-native';
import { angles, colors, fonts, typeScale } from '@/theme/tokens';

/** Fecha de hoy en una etiqueta blanca inclinada, sobre el título. */
export function DayTag({ label }: { label: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: colors.paper,
        transform: [{ skewX: `${angles.row}deg` }],
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyStrong,
          fontSize: typeScale.caption,
          color: colors.void,
          transform: [{ skewX: `${-angles.row}deg` }],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
```

`src/features/summary/components/SummaryBlock.tsx`:
```tsx
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Amount } from '@/components/Amount';
import { JaggedProgress } from '@/components/JaggedProgress';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { useActiveBudgets } from '@/features/budgets/hooks';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';
import type { BudgetPeriod } from '@/types/database';
import { comparisonText } from '../comparison';
import { useSpendingSummary } from '../hooks';

const LOAD_ERROR = 'No se pudieron cargar tus totales. Tira hacia abajo para reintentar.';
const DEFINE_BUDGET: Record<BudgetPeriod, string> = {
  week: 'Define un presupuesto semanal',
  month: 'Define un presupuesto mensual',
};

interface Props {
  period: BudgetPeriod;
  /** `hero` para la semana; `large` (más chico) para el mes. */
  size: 'hero' | 'large';
}

/** Total del período en DOP (de la RPC), comparación neutra con el anterior y barra del presupuesto activo. */
export function SummaryBlock({ period, size }: Props) {
  const summary = useSpendingSummary(period);
  const budgets = useActiveBudgets();
  if (summary.isPending) return <PlaceholderRows count={size === 'hero' ? 2 : 1} />;
  if (summary.isError) {
    return (
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.signal }}>
        {LOAD_ERROR}
      </Text>
    );
  }
  const { totalDop, previousTotalDop } = summary.data;
  const limit = budgets.data?.[period] ?? null;
  return (
    <View>
      <Amount value={totalDop} currency="DOP" size={size} />
      <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginTop: 4, marginBottom: 12 }}>
        {comparisonText(totalDop, previousTotalDop, period)}
      </Text>
      {limit !== null && limit > 0 ? (
        <JaggedProgress spent={totalDop} limit={limit} currency="DOP" />
      ) : budgets.isSuccess ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/budget')}
          style={{ minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper, textDecorationLine: 'underline' }}>
            {DEFINE_BUDGET[period]}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
```

`src/features/summary/components/RecentTransactions.tsx`:
```tsx
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { RansomText } from '@/components/RansomText';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { useRecentTransactions } from '@/features/transactions/hooks';
import type { TransactionListItem } from '@/features/transactions/mapping';
import { LOAD_TRANSACTIONS_ERROR, NO_TRANSACTIONS } from '@/features/transactions/messages';
import { colors, fonts, MIN_TOUCH, typeScale } from '@/theme/tokens';

interface Props {
  onPressItem: (item: TransactionListItem) => void;
}

/** "ÚLTIMOS MOVIMIENTOS": los 5 más recientes y el enlace "Ver todos" a Movimientos. */
export function RecentTransactions({ onPressItem }: Props) {
  const recent = useRecentTransactions();
  const message = (text: string, error = false) => (
    <Text style={{ fontFamily: fonts.body, fontSize: typeScale.body, color: error ? colors.signal : colors.ash }}>{text}</Text>
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexShrink: 1 }}>
          <RansomText text="ÚLTIMOS MOVIMIENTOS" size="sm" />
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/transactions')}
          style={{ minHeight: MIN_TOUCH, justifyContent: 'center', paddingLeft: 12 }}
        >
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper, textDecorationLine: 'underline' }}>
            Ver todos
          </Text>
        </Pressable>
      </View>
      {recent.isPending
        ? <PlaceholderRows count={3} />
        : recent.isError
          ? message(LOAD_TRANSACTIONS_ERROR, true)
          : recent.data.length === 0
            ? message(NO_TRANSACTIONS)
            : recent.data.map((item) => <TransactionRow key={item.id} item={item} onPress={onPressItem} />)}
    </View>
  );
}
```

`src/features/summary/components/HomeScreen.tsx`:
```tsx
import { RefreshControl, View } from 'react-native';
import { AddFab } from '@/components/AddFab';
import { RansomText } from '@/components/RansomText';
import { Screen } from '@/components/Screen';
import { useTimeZone } from '@/features/profile/hooks';
import { ExpenseSheet } from '@/features/transactions/components/ExpenseSheet';
import { useExpenseSheet } from '@/features/transactions/hooks';
import { formatDayLabel, toLocalDate } from '@/lib/dates';
import { colors } from '@/theme/tokens';
import { useHomeRefresh } from '../hooks';
import { DayTag } from './DayTag';
import { RecentTransactions } from './RecentTransactions';
import { SummaryBlock } from './SummaryBlock';

/** Inicio: semana en grande, mes más chico, últimos movimientos y botón "+". */
export function HomeScreen() {
  const timeZone = useTimeZone();
  const { refreshing, refresh } = useHomeRefresh();
  const { openNew, openEdit, sheet } = useExpenseSheet();
  return (
    <>
      <Screen
        title="ESTA SEMANA"
        backdrop={0}
        aboveTitle={<DayTag label={formatDayLabel(toLocalDate(new Date(), timeZone))} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />
        }
        floating={<AddFab onPress={openNew} />}
      >
        <SummaryBlock period="week" size="hero" />
        <View style={{ marginTop: 36, marginBottom: 16 }}>
          <RansomText text="ESTE MES" size="md" />
        </View>
        <SummaryBlock period="month" size="large" />
        <View style={{ marginTop: 36 }}>
          <RecentTransactions onPressItem={openEdit} />
        </View>
      </Screen>
      <ExpenseSheet {...sheet} />
    </>
  );
}
```

`app/(tabs)/index.tsx` (reemplazar completo):
```tsx
import { HomeScreen } from '@/features/summary/components/HomeScreen';

export default function HomeTab() {
  return <HomeScreen />;
}
```

- [ ] **Step 4: Verificar y commit**

Run: `bun run check` → verde. Run: `bun run verify:bundle` → `Exported`.
```bash
git add src/theme/tokens.ts src/components/Amount.tsx src/features/summary "app/(tabs)/index.tsx"
git commit -m "feat(app): build the home screen with weekly and monthly totals and recent movements" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Documentación y checklist del dispositivo

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/plans/2026-09-17-roadmap.md`
- Create: `docs/superpowers/plans/2026-10-06-plan-4b1-device-checklist.md`

- [ ] **Step 1: `CLAUDE.md`**

1. En "Estructura clave", cambiar el comentario de `features/<dominio>/` por `# auth, accounts, transactions, budgets, history, categories, summary, profile`.
2. Al final de "Convenciones de la app" agregar:
```markdown
- Sesión: `useSession()` / `useUserId()` de `src/features/auth/hooks.ts` (contexto de `SessionProvider`);
  nunca `supabase.auth.getSession()` dentro de pantallas. Al cerrar sesión se borra la caché de TanStack Query.
- Listas largas en `ListScreen` (un `FlatList` real, título como cabecera); `Screen` solo para contenido corto.
  Nunca un `FlatList` dentro de un `ScrollView`.
- Montos que escribe el usuario: `src/features/transactions/amount-input.ts` en centavos enteros; se envían
  como `cents / 100`. Nunca `parseFloat` sobre lo escrito.
- Fechas y rangos en la zona del perfil (`useTimeZone()` + `src/lib/dates.ts`); los rangos de filtros salen de
  `periodRange`, con las mismas reglas que las RPC (semana desde el lunes).
- Gasto manual: `source = 'manual'`, `type = 'card_purchase'`. El efectivo no se registra aparte: el retiro de
  cajero es el gasto.
```

- [ ] **Step 2: Roadmap**

En `docs/superpowers/plans/2026-09-17-roadmap.md`:
1. En la fila del Plan 4, cambiar el estado `4a ejecutado; 4b y 4c pendientes` por `4a y 4b-1 ejecutados; 4b-2 y 4c pendientes`.
2. Agregar al final de "Decisiones que cruzan planes":
```markdown
- **Plan 4b-1 (2026-10-06).** Spec `2026-10-06-plan-4b1-movimientos-inicio-design.md`. El retiro de cajero es
  el gasto (los manuales son para lo que no pasa por el banco); gasto manual = `card_purchase` + `manual`; fecha
  Hoy/Ayer/Otro día con la hora del registro; las categorías del panel son las 3 usadas más recientemente
  (selección de los últimos 30 movimientos, no un conteo en el cliente); sin interruptor de animaciones dentro
  de la app (solo el ajuste de Android). El 4b-2 cubre Historial, Presupuesto (crear/editar), Categorías y
  reglas y Ajustes.
```

- [ ] **Step 3: Checklist del dispositivo**

`docs/superpowers/plans/2026-10-06-plan-4b1-device-checklist.md`:
```markdown
# Plan 4b-1 — checklist en el dispositivo

Requisitos: los del Plan 4a (Expo Go, `.env.local`, misma red). Ejecutar `bun run start` y escanear el QR.
Para probar la barra de presupuesto hace falta un presupuesto activo: crearlo a mano en el Table Editor de
Supabase (`budgets`: tu `user_id`, `period = week`, `limit_amount`, `is_active = true`). Crear y editar
presupuestos desde la app llega en el 4b-2.

## Inicio
- [ ] Arriba aparece la fecha de hoy en una etiqueta blanca inclinada (p. ej. `MIÉ 07 / OCT`) y debajo ESTA SEMANA.
- [ ] Sin gastos: `RD$ 0.00`, "Igual que la semana pasada" y el enlace "Define un presupuesto semanal", que abre Presupuesto.
- [ ] El bloque ESTE MES es más chico que el de la semana.
- [ ] Mientras carga se ven tiras grises inclinadas, no un spinner.
- [ ] Tirar hacia abajo muestra el indicador rojo y recarga.
- [ ] En modo avión, tirar hacia abajo → "No se pudieron cargar tus totales. Tira hacia abajo para reintentar."
- [ ] Con un presupuesto semanal activo aparece la barra roja con el porcentaje.

## Agregar un gasto
- [ ] El "+" es un rombo rojo abajo a la derecha, en Inicio y en Movimientos.
- [ ] Al tocarlo, el panel NUEVO GASTO entra en diagonal; el monto dice `RD$ 0` con un cursor rojo.
- [ ] Cada tecla vibra. No deja escribir más de 2 decimales ni un segundo punto; "Punto" primero escribe `0.`.
- [ ] No pasa de `9,999,999.99`; "Borrar" quita la última cifra.
- [ ] "Guardar" está gris y no responde con el monto en cero.
- [ ] Tocar "Comercio o descripción": el teclado propio desaparece y sale el de Android; tocar el monto lo regresa.
- [ ] Categorías: aparecen 3 y "Más…"; "Más…" abre la lista completa y al elegir una se cierra.
- [ ] "Ayer" y "Otro día": el calendario no deja elegir días futuros y el chip muestra la fecha elegida.
- [ ] Guardar → el panel se cierra; el gasto aparece en Inicio (total y últimos movimientos) y en Movimientos sin recargar.
- [ ] Un gasto en US$ se ve como `US$` en su fila y el total de Inicio sube en pesos.

## Movimientos
- [ ] La lista se agrupa por día con encabezados inclinados (HOY, AYER, `JUE 01 / OCT`).
- [ ] Los gastos manuales llevan la marca "Manual".
- [ ] Por defecto muestra "Este mes" y el conteo ("3 movimientos").
- [ ] "Esta semana" y "Todo" cambian la lista y el conteo.
- [ ] "Categoría", "Moneda" y "Banco" abren una hoja de opciones; el chip muestra lo elegido y "Todas"/"Todos" lo quita.
- [ ] "Revisar" deja la lista vacía con "No hay movimientos con estos filtros." (todavía no hay reversas importadas).
- [ ] Con más de 50 movimientos, al bajar carga más sin saltos.

## Editar, ignorar y borrar
- [ ] Tocar una fila abre EDITAR GASTO con monto, comercio, categoría y fecha precargados.
- [ ] Cambiar el monto y guardar → la fila y el total de Inicio se actualizan.
- [ ] "Ignorar este gasto" → la fila queda gris con la marca "Ignorado" y el total baja; "Contar este gasto" lo devuelve.
- [ ] "Borrar" pide "¿Borrar este gasto? No se puede deshacer."; al confirmar, el gasto desaparece.
- [ ] Cerrar sesión y entrar de nuevo: no quedan datos de la sesión anterior.

## Accesibilidad
- [ ] Con TalkBack: el "+" se anuncia "Agregar gasto"; las teclas "Borrar" y "Punto decimal"; el monto completo ("Monto: 275.70 pesos").
- [ ] Con TalkBack, los chips anuncian si están seleccionados.
- [ ] Con "Quitar animaciones" del sistema activado, el panel aparece con un fundido corto, sin rebote.

## Rendimiento
- [ ] Desplazarse rápido por una lista larga no se traba.
```

- [ ] **Step 4: Verificar y commit**

Run: `bun run check` → verde.
```bash
git add CLAUDE.md docs/superpowers/plans/2026-09-17-roadmap.md docs/superpowers/plans/2026-10-06-plan-4b1-device-checklist.md
git commit -m "docs: record plan 4b-1 conventions, roadmap status and device checklist" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Después: `git push origin dev` y pedir al usuario que corra la checklist en su Android.
