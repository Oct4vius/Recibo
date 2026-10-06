export const springs = {
  snap: { damping: 18, stiffness: 380, mass: 0.6 },
  slam: { damping: 14, stiffness: 260, mass: 1 },
} as const;

export const durations = { tap: 90, screen: 220, reducedFade: 120, staggerStep: 35 } as const;

export const STAGGER_MAX_ROWS = 8;

/** Retraso de entrada de la fila `index`; deja de crecer después de 8 filas. */
export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ROWS - 1) * durations.staggerStep;
}
