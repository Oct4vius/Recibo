import type { MovementsView } from '../movements/movements-view';
import type { SectionId } from './sections';

/** Dónde está la app: la sección y, si se llegó con filtros, la vista de Movimientos. */
export interface ShellRoute {
  section: SectionId;
  movements: MovementsView | null;
  /** Sube con cada navegación; sirve de `key` para que Movimientos nazca de cero. */
  visit: number;
}

export const START_ROUTE: ShellRoute = { section: 'month', movements: null, visit: 0 };

/** La columna lateral: la sección se abre limpia, sin filtros heredados. */
export function selectSection(route: ShellRoute, section: SectionId): ShellRoute {
  return { section, movements: null, visit: route.visit + 1 };
}

/** Abrir Movimientos ya filtrado (p. ej. desde una categoría de Este mes). */
export function openMovements(route: ShellRoute, view: MovementsView): ShellRoute {
  return { section: 'movements', movements: view, visit: route.visit + 1 };
}
