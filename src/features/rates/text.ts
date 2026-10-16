import { approxAccessibilityLabel, formatApprox } from '@/lib/money';
import { monthAbbreviation, parseIsoDate } from '@/lib/dates';
import type { UsdRateOrigin } from '@/types/database';
import type { LatestUsdRate } from './api';

/** Equivalente en pesos de un gasto en USD con la tasa que usó la base de datos. */
export interface DopEquivalent {
  amountDop: number;
  rate: number;
  /** Fecha de la tasa del BCRD; null cuando se usó la de respaldo de Ajustes. */
  rateDate: string | null;
  origin: UsdRateOrigin;
}

const rate = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** `59.12`, `60.00`, `63.0215`: de 2 a 4 decimales. */
export function formatRate(value: number): string {
  return rate.format(value);
}

/** `2026-09-07` → `7 sep`. */
export function rateDateLabel(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return `${date.day} ${monthAbbreviation(date.month).toLowerCase()}`;
}

function rateClause(eq: DopEquivalent): string {
  if (eq.origin === 'bcrd' && eq.rateDate) return `tasa BCRD del ${rateDateLabel(eq.rateDate)}: ${formatRate(eq.rate)}`;
  return `tasa de Ajustes: ${formatRate(eq.rate)}`;
}

/** `≈ RD$ 896.26 · tasa BCRD del 7 sep: 59.12` (o `· tasa de Ajustes: 60.00`). */
export function conversionText(eq: DopEquivalent): string {
  return `${formatApprox(eq.amountDop, 'DOP')} · ${rateClause(eq)}`;
}

export function conversionAccessibilityText(eq: DopEquivalent): string {
  return `${approxAccessibilityLabel(eq.amountDop, 'DOP')}, ${rateClause(eq)}`;
}

/** Línea informativa de Ajustes con la última tasa del BCRD guardada. */
export function latestRateText(latest: LatestUsdRate | null): string {
  if (!latest) return 'Aún no hay tasas del BCRD: se usa la de respaldo.';
  return `Última tasa BCRD: ${formatRate(latest.sell)} (${rateDateLabel(latest.date)}).`;
}
