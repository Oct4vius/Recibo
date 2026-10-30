import { addDays, monthName, parseIsoDate, type LocalDate } from '@/lib/dates';
import type { Granularity, HistoryView } from '@/features/history/granularity';
import { monthTitle } from '../month/month-text';

/** Orden de los botones: Mes primero, que es con el que abre la pantalla. */
export const DESKTOP_VIEWS: readonly HistoryView[] = ['month', 'week', 'year', 'all'];

/** `Octubre 2026`, `2026` o `Semana del 5 al 11 de octubre`. */
export function periodTitle(granularity: Granularity, start: LocalDate): string {
  if (granularity === 'month') return monthTitle(start);
  if (granularity === 'year') return String(start.year);
  const end = addDays(start, 6);
  const from = end.month === start.month ? `${start.day}` : `${start.day} de ${monthName(start.month)}`;
  return `Semana del ${from} al ${end.day} de ${monthName(end.month)}`;
}

/** `Desde septiembre 2026` a partir de la fecha ISO del primer gasto. */
export function allTimeTitle(firstIso: string): string {
  const first = parseIsoDate(firstIso);
  return `Desde ${monthName(first.month)} ${first.year}`;
}
