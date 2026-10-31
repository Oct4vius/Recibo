import { addMonths, isSameDate, monthStart, type LocalDate } from '@/lib/dates';

/** Primer día del mes anterior. */
export function previousMonth(start: LocalDate): LocalDate {
  return addMonths(start, -1);
}

/** Primer día del mes siguiente; null si `start` ya es el mes actual (o uno posterior). */
export function nextMonth(start: LocalDate, current: LocalDate): LocalDate | null {
  const currentStart = monthStart(current);
  const here = monthStart(start);
  if (isSameDate(here, currentStart)) return null;
  const next = addMonths(here, 1);
  // Un mes posterior al actual no existe para navegar.
  const beyond = next.year > currentStart.year || (next.year === currentStart.year && next.month > currentStart.month);
  return beyond ? null : next;
}

/** Qué mes queda fijado al avanzar: null si `next` es el actual (vuelve a seguir al mes de hoy). */
export function selectionAfterNext(next: LocalDate, current: LocalDate): LocalDate | null {
  return isSameDate(next, monthStart(current)) ? null : next;
}
