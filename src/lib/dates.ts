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
const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
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
  return `${WEEKDAY_ES[date.weekday - 1]} ${day} / ${monthAbbreviation(date.month)}`;
}

/** `OCT`: abreviatura del mes (1 = enero). */
export function monthAbbreviation(month: number): string {
  return MONTH_ES[month - 1];
}

/** `octubre`: nombre del mes en minúsculas (1 = enero). */
export function monthName(month: number): string {
  return MONTH_NAMES_ES[month - 1];
}

/** `2026-10-05` (columna `date` de Postgres) → fecha de calendario. */
export function parseIsoDate(iso: string): LocalDate {
  const [year, month, day] = iso.split('-').map(Number);
  return localDate(year, month, day);
}

/** Días de `from` a `to` (negativo si `to` es anterior). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / DAY_MS);
}

/** Día 1 del mes que está `months` meses después (o antes) del mes de `date`. */
export function addMonths(date: LocalDate, months: number): LocalDate {
  return localDate(date.year, date.month + months, 1);
}

export function yearStart(date: LocalDate): LocalDate {
  return localDate(date.year, 1, 1);
}

/** Desfase de `timeZone` respecto de UTC en ese instante, en minutos (Santo Domingo: -240). */
export function utcOffsetMinutes(instant: Date, timeZone: string): number {
  const p = localParts(instant, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, 0, p.minutes);
  const minute = Math.floor(instant.getTime() / 60_000) * 60_000;
  return Math.round((wall - minute) / 60_000);
}
