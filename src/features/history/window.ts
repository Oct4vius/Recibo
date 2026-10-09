import { addDays, addMonths, localDate, monthStart, weekStart, yearStart, zonedInstant, type LocalDate } from '@/lib/dates';
import type { Granularity } from './granularity';

/** Barras por ventana: 8 semanas, 6 meses o 3 años. */
export const HISTORY_SIZE: Record<Granularity, number> = { week: 8, month: 6, year: 3 };

/** Inicio del período que contiene `date` (semana desde el lunes, como las RPC). */
export function periodStartOf(granularity: Granularity, date: LocalDate): LocalDate {
  if (granularity === 'week') return weekStart(date);
  if (granularity === 'month') return monthStart(date);
  return yearStart(date);
}

/** Inicio del período `n` períodos después (o antes) de `start`. */
export function addPeriods(granularity: Granularity, start: LocalDate, n: number): LocalDate {
  if (granularity === 'week') return addDays(start, 7 * n);
  if (granularity === 'month') return addMonths(start, n);
  return localDate(start.year + n, 1, 1);
}

export interface HistoryWindow {
  /** Inicio del primer período (el más viejo). */
  first: LocalDate;
  /** Inicio del último período (el actual si `offset` es 0). */
  last: LocalDate;
  size: number;
}

/** Ventana de `size` períodos; `offset` 0 termina en el actual, 1 en el bloque anterior, etc. */
export function historyWindow(granularity: Granularity, offset: number, today: LocalDate): HistoryWindow {
  const size = HISTORY_SIZE[granularity];
  const last = addPeriods(granularity, periodStartOf(granularity, today), -size * offset);
  return { first: addPeriods(granularity, last, -(size - 1)), last, size };
}

/** Rango de un período en instantes de la zona del perfil (`to` exclusivo), para filtrar Movimientos. */
export function bucketRange(granularity: Granularity, start: LocalDate, timeZone: string): { from: string; to: string } {
  return {
    from: zonedInstant(start, 0, timeZone).toISOString(),
    to: zonedInstant(addPeriods(granularity, start, 1), 0, timeZone).toISOString(),
  };
}
