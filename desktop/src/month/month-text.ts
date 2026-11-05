import { monthName, type LocalDate } from '@/lib/dates';
import { expenseCountLabel } from '@/features/history/labels';
import { formatMoney } from '@/lib/money';
import { budgetBalance, progressState } from '@/theme/progress';

/** Primera letra en mayúscula: `octubre` → `Octubre`. */
export function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** `Octubre 2026`. */
export function monthTitle(start: LocalDate): string {
  return `${capitalize(monthName(start.month))} ${start.year}`;
}

/** `Llevas 23 gastos este mes` en el mes actual; `31 gastos en septiembre` en uno pasado. */
export function expenseCountLine(count: number, isCurrent: boolean, start: LocalDate): string {
  if (isCurrent) return `Llevas ${expenseCountLabel(count)} este mes`;
  return `${expenseCountLabel(count)} en ${monthName(start.month)}`;
}

/** Lista de categorías vacía. */
export function noSpendingText(isCurrent: boolean, start: LocalDate): string {
  return isCurrent ? 'Aún no hay gastos este mes.' : `No hubo gastos en ${monthName(start.month)}.`;
}

export interface BudgetLine {
  text: string;
  /** Porción de la barra, entre 0 y 1. */
  fill: number;
  over: boolean;
}

/** Texto y barra del presupuesto mensual; sin límite válido no hay presupuesto. */
export function budgetLine(spentDop: number, limitDop: number | null): BudgetLine {
  if (limitDop === null || limitDop <= 0) return { text: 'Aún no tienes presupuesto', fill: 0, over: false };
  const { fill, percent, tone } = progressState(spentDop, limitDop);
  const balance = budgetBalance(spentDop, limitDop);
  const money = formatMoney(balance.cents / 100, 'DOP');
  if (balance.kind === 'over') return { text: `Te pasaste por ${money}`, fill, over: true };
  if (tone === 'over') return { text: 'Llegaste a tu presupuesto', fill, over: true };
  return { text: `${percent} % de tu presupuesto · Te quedan ${money}`, fill, over: false };
}
