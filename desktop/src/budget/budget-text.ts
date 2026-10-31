import type { AlertThreshold } from '@/features/profile/alerts';
import { centsToText } from '@/features/transactions/amount-input';
import { toCents } from '@/lib/money';
import type { BudgetPeriod } from '@/types/database';

export const BUDGET_TITLES: Record<BudgetPeriod, string> = {
  month: 'Presupuesto del mes',
  week: 'Presupuesto de la semana',
};

/** El mes primero: es el que ve Este mes. */
export const BUDGET_ORDER: readonly BudgetPeriod[] = ['month', 'week'];

/** Límite guardado → texto del campo; sin presupuesto, el campo queda vacío. */
export function limitText(limit: number | null): string {
  return limit === null ? '' : centsToText(toCents(limit));
}

export function thresholdLabel(threshold: AlertThreshold): string {
  return `Avisarme al llegar al ${threshold} %`;
}
