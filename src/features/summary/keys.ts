import type { BudgetPeriod } from '@/types/database';

export const summaryKeys = {
  all: ['summary'] as const,
  period: (period: BudgetPeriod) => ['summary', period] as const,
};
