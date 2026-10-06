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
  const ratio = Math.max(spent, 0) / limit;
  const tone: ProgressTone = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'normal';
  return { fill: Math.min(ratio, 1), percent: Math.floor(ratio * 100), tone };
}
