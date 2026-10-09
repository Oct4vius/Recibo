import type { RangePeriod } from './filters';

type Param = string | string[] | undefined;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/** Parámetros vacíos: la pantalla los deja así tras aplicar el rango, para que volver a la pestaña no lo reaplique. */
export const CLEARED_RANGE_PARAMS = { from: '', to: '', label: '' };

const first = (param: Param): string => (Array.isArray(param) ? (param[0] ?? '') : (param ?? ''));

/** Rango de fechas que Historial pasa a Movimientos al navegar; null si no hay o es inválido. */
export function rangeFromParams(params: { from?: Param; to?: Param; label?: Param }): RangePeriod | null {
  const from = first(params.from);
  const to = first(params.to);
  const label = first(params.label);
  if (!label || !ISO_INSTANT.test(from) || !ISO_INSTANT.test(to) || from >= to) return null;
  return { kind: 'range', from, to, label };
}
