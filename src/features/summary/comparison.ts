import { formatMoney } from '@/lib/money';
import type { BudgetPeriod } from '@/types/database';

const PREVIOUS: Record<BudgetPeriod, string> = { week: 'la semana pasada', month: 'el mes pasado' };

/** "RD$ 612.30 más que la semana pasada". Neutro: ni celebra gastar menos ni castiga gastar más. */
export function comparisonText(current: number, previous: number, period: BudgetPeriod): string {
  const diffCents = Math.round(current * 100) - Math.round(previous * 100);
  if (diffCents === 0) return `Igual que ${PREVIOUS[period]}`;
  const amount = formatMoney(Math.abs(diffCents) / 100, 'DOP');
  return `${amount} ${diffCents > 0 ? 'más' : 'menos'} que ${PREVIOUS[period]}`;
}
