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
