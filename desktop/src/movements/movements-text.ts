import { monthName, type LocalDate } from '@/lib/dates';
import { presentRow, type RowPresentation, type TransactionListItem } from '@/features/transactions/mapping';
import type { MovementsView } from './movements-view';

// `date.weekday`: 1 = lunes.
const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** `Hoy`, `Ayer` o `Viernes 30 de octubre`. */
export function dayHeading(date: LocalDate, relative: 'today' | 'yesterday' | null): string {
  if (relative === 'today') return 'Hoy';
  if (relative === 'yesterday') return 'Ayer';
  const weekday = WEEKDAYS[date.weekday - 1];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.day} de ${monthName(date.month)}`;
}

/** La fila con palabras de uso diario: sin "Reversa", "Ignorado" ni "Manual". */
export function presentMovement(item: TransactionListItem): RowPresentation {
  const row = presentRow(item);
  const reversal = item.type === 'card_reversal';
  return {
    ...row,
    title: item.merchant?.trim() || (reversal ? 'Devolución' : 'Sin descripción'),
    badge: reversal ? 'Devolución' : item.isIgnored ? 'No se cuenta' : item.source === 'manual' ? 'Agregado a mano' : undefined,
  };
}

/** Mensaje de lista vacía según lo que la limita. */
export function emptyMovementsText(view: MovementsView, _current: LocalDate): string {
  if (view.categoryId !== null || view.bankCode !== null || view.review) return 'No hay movimientos con estos filtros.';
  const { scope } = view;
  if (scope.kind === 'all') return 'Todavía no hay movimientos.';
  if (scope.kind === 'range') return 'No hay movimientos en este período.';
  return `No hay movimientos en ${monthName(scope.start.month)}.`;
}
