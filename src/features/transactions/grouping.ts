import { addDays, formatDayLabel, isSameDate, toIsoDate, toLocalDate, type LocalDate } from '@/lib/dates';

export type ListEntry<T> = { kind: 'header'; key: string; title: string } | { kind: 'row'; key: string; item: T };

/** Texto del encabezado de un día; `relative` dice si es hoy o ayer. */
export type DayLabel = (date: LocalDate, relative: 'today' | 'yesterday' | null) => string;

/** Etiqueta del teléfono: "HOY", "AYER" o `MAR 06 / OCT`. */
const phoneDayLabel: DayLabel = (date, relative) =>
  relative === 'today' ? 'HOY' : relative === 'yesterday' ? 'AYER' : formatDayLabel(date);

/** Inserta un encabezado antes de cada día local (por defecto "HOY", "AYER" o `MAR 06 / OCT`). Respeta el orden recibido. */
export function groupByDay<T extends { id: string; occurredAt: string }>(
  items: readonly T[],
  now: Date,
  timeZone: string,
  label: DayLabel = phoneDayLabel,
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
      const relative = isSameDate(date, today) ? 'today' : isSameDate(date, yesterday) ? 'yesterday' : null;
      entries.push({ kind: 'header', key: `day-${day}`, title: label(date, relative) });
    }
    entries.push({ kind: 'row', key: item.id, item });
  }
  return entries;
}
