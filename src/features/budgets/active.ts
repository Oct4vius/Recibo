import type { BudgetPeriod } from '@/types/database';

export interface ActiveBudgets {
  week: number | null;
  month: number | null;
}

export function toActiveBudgets(rows: readonly { period: BudgetPeriod; limit_amount: number }[]): ActiveBudgets {
  const limitOf = (period: BudgetPeriod) => rows.find((row) => row.period === period)?.limit_amount ?? null;
  return { week: limitOf('week'), month: limitOf('month') };
}
