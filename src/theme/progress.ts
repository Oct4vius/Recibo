export type ProgressTone = 'normal' | 'warning' | 'over';

export interface ProgressState {
  /** Porción de la barra a pintar, entre 0 y 1. */
  fill: number;
  /** Porcentaje gastado, redondeado hacia abajo (79.98 % se muestra 79 %). */
  percent: number;
  tone: ProgressTone;
}

/** Estado de la barra de presupuesto. Umbrales: 80 % (aviso) y 100 % (pasado). */
export function progressState(spent: number, limit: number): ProgressState {
  if (limit <= 0) throw new Error('limit must be greater than 0');
  // Los montos son numeric(14,2): se compara en centavos enteros para evitar errores de coma flotante.
  const spentCents = Math.round(Math.max(spent, 0) * 100);
  const limitCents = Math.round(limit * 100);
  const tone: ProgressTone =
    spentCents >= limitCents ? 'over' : spentCents * 100 >= limitCents * 80 ? 'warning' : 'normal';
  return {
    fill: Math.min(spentCents / limitCents, 1),
    percent: Math.floor((spentCents * 100) / limitCents),
    tone,
  };
}
