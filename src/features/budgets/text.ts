import { daysBetween, parseIsoDate, type LocalDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { BudgetBalance } from '@/theme/progress';
import type { BudgetPeriod } from '@/types/database';

export const PERIOD_TITLE: Record<BudgetPeriod, string> = { week: 'SEMANAL', month: 'MENSUAL' };
export const LIMIT_TITLE: Record<BudgetPeriod, string> = { week: 'LÍMITE SEMANAL', month: 'LÍMITE MENSUAL' };
export const DEFINE_LIMIT: Record<BudgetPeriod, string> = { week: 'Definir límite semanal', month: 'Definir límite mensual' };
export const LOAD_BUDGET_ERROR = 'No se pudo cargar tu presupuesto. Tira hacia abajo para reintentar.';
const PERIOD_ADJECTIVE: Record<BudgetPeriod, string> = { week: 'semanal', month: 'mensual' };

/** Días que quedan contando hoy. `periodEnd` es el fin exclusivo que devuelve la RPC. */
export function daysLeft(periodEnd: string, today: LocalDate): number {
  return daysBetween(today, parseIsoDate(periodEnd));
}

export function balanceText(balance: BudgetBalance, days: number): string {
  const amount = formatMoney(balance.cents / 100, 'DOP');
  const lead = balance.kind === 'left' ? 'Quedan' : 'Te pasaste por';
  return `${lead} ${amount} · ${days === 1 ? '1 día' : `${days} días`}`;
}

export function spentOfLimitText(spent: number, limit: number): string {
  return `${formatMoney(spent, 'DOP')} de ${formatMoney(limit, 'DOP')}`;
}

export function removeBudgetPrompt(period: BudgetPeriod): { title: string; message: string } {
  return { title: `¿Quitar el presupuesto ${PERIOD_ADJECTIVE[period]}?`, message: 'Dejarás de ver la barra y los avisos.' };
}
