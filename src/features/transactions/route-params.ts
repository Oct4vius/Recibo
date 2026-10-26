import { DEFAULT_FILTERS, UNCATEGORIZED, type RangePeriod, type TransactionFilters } from './filters';

type Param = string | string[] | undefined;

/** Lo que Historial pasa a `router.navigate` para abrir Movimientos ya filtrado. */
export interface TransactionRouteParams {
  from?: string;
  to?: string;
  label?: string;
  period?: 'all';
  categoryId?: string;
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parámetros vacíos: la pantalla los deja así tras aplicar el filtro, para que volver a la pestaña no lo reaplique. */
export const CLEARED_RANGE_PARAMS = { from: '', to: '', label: '', period: '', categoryId: '' };

const first = (param: Param): string => (Array.isArray(param) ? (param[0] ?? '') : (param ?? ''));

/** Rango de fechas que Historial pasa a Movimientos al navegar; null si no hay o es inválido. */
export function rangeFromParams(params: { from?: Param; to?: Param; label?: Param }): RangePeriod | null {
  const from = first(params.from);
  const to = first(params.to);
  const label = first(params.label);
  if (!label || !ISO_INSTANT.test(from) || !ISO_INSTANT.test(to) || from >= to) return null;
  return { kind: 'range', from, to, label };
}

/** Filtros que Historial pide al navegar (rango o "Todo", más categoría); null si no hay período que aplicar. */
export function filtersFromParams(params: {
  from?: Param;
  to?: Param;
  label?: Param;
  period?: Param;
  categoryId?: Param;
}): TransactionFilters | null {
  const range = rangeFromParams(params);
  if (!range && first(params.period) !== 'all') return null;
  // Un id que no sea "none" ni uuid se descarta: llegaría a Postgres como 22P02.
  const categoryId = first(params.categoryId);
  const validCategory = categoryId === UNCATEGORIZED || UUID.test(categoryId) ? categoryId : null;
  return { ...DEFAULT_FILTERS, period: range ?? 'all', categoryId: validCategory };
}
