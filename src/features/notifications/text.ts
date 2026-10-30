import { PERIOD_ADJECTIVE } from '@/features/budgets/text';
import type { ClaimedAlert } from './mapping';

export const BUDGET_ALERT_KIND = 'budget';

export interface BudgetAlertContent {
  title: string;
  body: string;
  data: { kind: typeof BUDGET_ALERT_KIND };
}

const BODY = 'Toca para ver tu gasto.';

/** Texto del aviso. Nunca lleva montos (decisión del usuario). */
export function budgetAlertContent(alert: ClaimedAlert): BudgetAlertContent {
  const period = PERIOD_ADJECTIVE[alert.period];
  const title = alert.threshold >= 100 ? `Llegaste a tu presupuesto ${period}` : `Llevas el ${alert.threshold} % de tu presupuesto ${period}`;
  return { title, body: BODY, data: { kind: BUDGET_ALERT_KIND } };
}

export function isBudgetAlertData(data: unknown): boolean {
  return typeof data === 'object' && data !== null && (data as { kind?: unknown }).kind === BUDGET_ALERT_KIND;
}
