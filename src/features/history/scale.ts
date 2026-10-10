import { toCents } from '@/lib/money';

/** Altura relativa (0–1) de cada barra respecto de la mayor, en centavos enteros. Una barra no vacía nunca baja de `minRatio`. */
export function barRatios(totals: readonly number[], minRatio = 0.02): number[] {
  const cents = totals.map((total) => Math.max(0, toCents(total)));
  const max = Math.max(0, ...cents);
  if (max === 0) return cents.map(() => 0);
  return cents.map((value) => (value === 0 ? 0 : Math.max(value / max, minRatio)));
}
