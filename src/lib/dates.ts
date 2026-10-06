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
